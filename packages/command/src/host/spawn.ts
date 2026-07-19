/**
 * Canonical cross-platform subprocess helper. Owns:
 *   - Windows cmd.exe wrapper for resolving .cmd/.bat shims (pnpm, tsx, etc.)
 *     without enabling shell metacharacter interpretation.
 *   - Bounded stderr ring buffer.
 *   - Idempotent dispose (SIGINT → 2s grace → SIGKILL).
 *   - withSpawned try/finally lifecycle for tests.
 *
 * The helper deliberately does not pass an `env` field to `child_process.spawn`,
 * so children inherit `process.env` — including `NODE_V8_COVERAGE` set by
 * coverage:node:tracked. This is what makes subprocess coverage capture
 * automatic. A drift-guard test (tests/unit/meta/spawn-coverage-inheritance.test.ts)
 * fails CI if any future commit adds an env override.
 *
 * Lives in `@liteship/command/host` (CUT A1 capstone-1) — the canonical home for
 * Node host execution shared by the CLI and MCP adapters. `@liteship/cli`'s
 * `lib/spawn.ts` / `spawn-helpers.ts` and `scripts/lib/spawn.ts` are thin
 * re-exports so existing import paths keep working; this is the one impl the
 * spawn drift-guard tests pin.
 *
 * @module
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { IoError } from '@liteship/error';

/**
 * Discriminate a "the process is already gone" kill failure (the designed
 * best-effort case — every kill site below races the child's own natural exit)
 * from a genuinely unexpected fault that must NOT be silently masked.
 *
 * The recognized best-effort codes:
 *   - `ESRCH` — POSIX `kill(2)`: no such process. The child exited between our
 *     liveness check and the signal — exactly the race these kills tolerate.
 *   - `EPERM` — POSIX: we lost permission to signal it (it re-parented / changed
 *     credentials as it died). Non-actionable here; the child is leaving our
 *     control, which is the outcome the kill wanted anyway.
 *   - On Windows `taskkill` (run via `execSync`) the "PID not found" exit is
 *     surfaced as a thrown error whose `status` is `128`; treat that one exit
 *     code as the already-gone case.
 *
 * Anything else (e.g. POSIX `EIO`, a Windows access-denied `status: 1`) is a
 * real fault: the caller raised a tagged {@link IoError} instead of swallowing.
 */
function isProcessGoneError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'ESRCH' || code === 'EPERM') return true;
  // execSync surfaces the child's nonzero exit as `status`; taskkill's
  // process-not-found exit is 128 (our already-gone case).
  const status = (err as { status?: number }).status;
  return status === 128;
}

/** Result of a one-shot spawnArgv invocation. */
export interface SpawnResult {
  readonly exitCode: number;
  readonly stderrTail: string;
}

/** Options for spawnArgv / withSpawned. */
export interface SpawnArgvOpts {
  /** Maximum stderr bytes retained in the returned tail. Defaults to 16 KiB. */
  readonly stderrCapBytes?: number;
  /** Override stdio. Defaults to ['ignore', 'inherit', 'pipe']. */
  readonly stdio?: 'inherit' | 'pipe' | readonly ('ignore' | 'inherit' | 'pipe')[];
  /** Working directory for the spawned process. Defaults to process.cwd(). */
  readonly cwd?: string;
}

/** Result of a one-shot spawnArgvCapture invocation. */
export interface SpawnCaptureResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  /**
   * True when the spawn was killed by {@link SpawnCaptureOpts.timeoutMs} before it
   * closed on its own — distinguishable from a normal nonzero exit. Absent (falsy)
   * for every spawn that completed or that was launched without `timeoutMs`.
   */
  readonly timedOut?: boolean;
}

/** Options for spawnArgvCapture. */
export interface SpawnCaptureOpts {
  /** Working directory for the spawned process. Defaults to process.cwd(). */
  readonly cwd?: string;
  /** Maximum bytes retained per stream. Defaults to 1 MiB. */
  readonly captureBytes?: number;
  /**
   * If set, kill the child after this many ms and resolve with `timedOut: true`
   * (never rejects on timeout). For bounding short external probes (e.g. `liteship
   * doctor`'s `pnpm --version`) so a slow/wedged tool can't hang the caller.
   * Omitted → existing behavior (resolve only on the child's `close`).
   */
  readonly timeoutMs?: number;
}

/** Live handle on a running spawn — used by withSpawned. */
export interface SpawnHandle {
  readonly pid: number;
  readonly child: ChildProcess;
  /** Read stdout as a string stream. Only present when stdio[1] is 'pipe'. */
  readline(): AsyncIterableIterator<string>;
  /** Drain any retained stderr bytes accumulated so far. */
  readonly stderrTail: () => string;
  /** Idempotent disposal. SIGINT → 2s grace → SIGKILL. No-op if already dead. */
  dispose(): Promise<void>;
}

function pushBoundedStderr(chunks: Buffer[], currentBytes: number, chunk: Buffer, cap: number): number {
  chunks.push(chunk);
  let nextBytes = currentBytes + chunk.length;

  while (nextBytes > cap && chunks.length > 0) {
    const overflow = nextBytes - cap;
    const head = chunks[0];
    if (!head) break;

    if (head.length <= overflow) {
      chunks.shift();
      nextBytes -= head.length;
      continue;
    }

    chunks[0] = head.subarray(overflow);
    nextBytes -= overflow;
  }

  return nextBytes;
}

/**
 * Quote a single argv token for safe inclusion in a Windows cmd.exe command
 * line. Tokens with no special characters round-trip as-is; everything else
 * is double-quoted with internal quotes backslash-escaped. Keeps shell
 * metacharacters (`;`, `&`, `|`, `<`, `>`, `^`, `(`, `)`) inside a quoted
 * string so cmd.exe treats them as literal bytes.
 *
 * Re-exported by packages/cli/src/spawn-helpers.ts and
 * scripts/support/pnpm-process.ts; tests/unit/spawn-quoting-drift.test.ts
 * enforces byte-equivalence across all three call sites.
 */
export function quoteWindowsArg(arg: string): string {
  if (arg.length === 0) return '""';
  if (!/[\s"&|<>^();]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

/**
 * Resolve a (command, args) pair into a launcher invocation that does NOT
 * enable shell interpretation but still finds .cmd / .bat shims on Windows.
 * On POSIX this is identity.
 */
function resolveLauncher(command: string, args: readonly string[]): { command: string; args: readonly string[] } {
  if (process.platform !== 'win32') {
    return { command, args };
  }
  const commandLine = [command, ...args].map(quoteWindowsArg).join(' ');
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', commandLine] };
}

/**
 * Run a subprocess with an argv array (`shell: false`). stderr is captured
 * with a bounded ring buffer; stdout inherits the parent. Resolves once the
 * subprocess exits — never throws on nonzero exit (callers branch on
 * `exitCode`).
 */
export function spawnArgv(command: string, args: readonly string[], opts: SpawnArgvOpts = {}): Promise<SpawnResult> {
  const cap = opts.stderrCapBytes ?? 16_384;
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const stdio = (opts.stdio ?? ['ignore', 'inherit', 'pipe']) as ('ignore' | 'inherit' | 'pipe')[];
    const proc = spawn(launcher.command, launcher.args as string[], {
      stdio,
      shell: false,
      cwd: opts.cwd,
      // On Windows the cmd.exe launcher needs verbatim args so Node doesn't
      // re-escape the command tail and break exit-code propagation.
      windowsVerbatimArguments: process.platform === 'win32',
      // CRITICAL: do not set `env` — children must inherit NODE_V8_COVERAGE.
    });
    const stderrChunks: Buffer[] = [];
    let stderrBytes = 0;
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBytes = pushBoundedStderr(stderrChunks, stderrBytes, chunk, cap);
    });
    proc.on('error', rejectPromise);
    proc.on('close', (code) => {
      resolvePromise({
        exitCode: code ?? 1,
        stderrTail: Buffer.concat(stderrChunks as unknown as Uint8Array[]).toString('utf8'),
      });
    });
  });
}

/**
 * Run a subprocess whose progress should remain visible to humans, but whose
 * stdout must NOT pollute our own stdout. Child stdout is piped to our
 * stderr; child stderr inherits to our stderr; child stdin is closed.
 *
 * Use this for commands like `liteship doctor --fix` whose stdout contract is
 * JSON-only (the doctor receipt is written to stdout AFTER the fixes run,
 * and would otherwise be preceded by the build's tsc output line by line).
 *
 * The stderrTail field of the returned SpawnResult is empty — both streams
 * went through to the user, none of them are buffered for postmortem.
 */
export function spawnArgvVisible(
  command: string,
  args: readonly string[],
  opts: { readonly cwd?: string } = {},
): Promise<SpawnResult> {
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn(launcher.command, launcher.args as string[], {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: false,
      cwd: opts.cwd,
      windowsVerbatimArguments: process.platform === 'win32',
    });
    proc.stdout?.pipe(process.stderr, { end: false });
    proc.on('error', rejectPromise);
    proc.on('close', (code) => {
      resolvePromise({ exitCode: code ?? 1, stderrTail: '' });
    });
  });
}

/**
 * Run a subprocess and fully capture stdout + stderr to strings, with an
 * optional `cwd`. Used by ship/verify where the publisher needs the
 * subprocess output (pnpm pack's tarball path, pnpm publish --dry-run's
 * notice block) as a byte sequence to hash. Like spawnArgv, never throws
 * on nonzero exit — callers branch on `exitCode`.
 */
export function spawnArgvCapture(
  command: string,
  args: readonly string[],
  opts: SpawnCaptureOpts = {},
): Promise<SpawnCaptureResult> {
  const cap = opts.captureBytes ?? 1_048_576;
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn(launcher.command, launcher.args as string[], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      cwd: opts.cwd,
      windowsVerbatimArguments: process.platform === 'win32',
      // CRITICAL: do not set `env` — children must inherit NODE_V8_COVERAGE.
    });
    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    const stderrChunks: Buffer[] = [];
    let stderrBytes = 0;
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes = pushBoundedStderr(stdoutChunks, stdoutBytes, chunk, cap);
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBytes = pushBoundedStderr(stderrChunks, stderrBytes, chunk, cap);
    });
    // Single-settlement guard: a timeout, a close, and an error all race; whichever
    // fires first wins and the others become no-ops (no double resolve/reject).
    let settled = false;
    const text = (chunks: Buffer[]): string => Buffer.concat(chunks as unknown as Uint8Array[]).toString('utf8');

    // Prompt kill for the timeout path. These are short probes (`--version`,
    // `git config`), not long-lived servers — no graceful grace period needed.
    // spawnArgvCapture does not detach, so there is no POSIX process group to
    // signal; on Windows the launcher may be cmd.exe, so reap the tree with taskkill.
    const killNow = (): void => {
      if (proc.pid === undefined) return;
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /T /F /PID ${proc.pid}`, { stdio: 'ignore' });
        } catch (err) {
          if (!isProcessGoneError(err)) {
            throw IoError('spawn.killNow', `taskkill failed for pid ${proc.pid}`, { cause: err });
          }
          // already gone — the timeout raced the child's own exit.
        }
        return;
      }
      try {
        proc.kill('SIGKILL');
      } catch (err) {
        if (!isProcessGoneError(err)) {
          throw IoError('spawn.killNow', `SIGKILL failed for pid ${proc.pid}`, { cause: err });
        }
        // already gone — the timeout raced the child's own exit.
      }
    };

    const timer =
      opts.timeoutMs !== undefined
        ? setTimeout(() => {
            if (settled) return;
            settled = true;
            killNow();
            // 124 = conventional "killed by timeout" exit code; `timedOut` is the
            // load-bearing signal callers branch on.
            resolvePromise({ exitCode: 124, stdout: text(stdoutChunks), stderr: text(stderrChunks), timedOut: true });
          }, opts.timeoutMs)
        : null;

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      rejectPromise(err);
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolvePromise({ exitCode: code ?? 1, stdout: text(stdoutChunks), stderr: text(stderrChunks) });
    });
  });
}

/**
 * Lifecycle-managed spawn for tests. Spawns, runs the callback, disposes the
 * child in `finally` (idempotent: SIGINT → 2s grace → SIGKILL → no-op).
 *
 * Tests never write `try/finally proc.kill()` themselves — a single
 * implementation handles cleanup uniformly on Linux and Windows.
 */
export async function withSpawned<T>(
  command: string,
  args: readonly string[],
  fn: (handle: SpawnHandle) => Promise<T>,
  opts: SpawnArgvOpts = {},
): Promise<T> {
  const handle = startSpawn(command, args, opts);
  try {
    return await fn(handle);
  } finally {
    await handle.dispose();
  }
}

/**
 * Start a long-lived subprocess and return a live handle. Caller owns
 * disposal. Used by `withSpawned` (auto-disposes in finally) and by
 * Vitest browser commands that need to keep the child alive across
 * multiple browser-side calls.
 */
export function startSpawnHandle(command: string, args: readonly string[], opts: SpawnArgvOpts = {}): SpawnHandle {
  return startSpawn(command, args, opts);
}

function startSpawn(command: string, args: readonly string[], opts: SpawnArgvOpts): SpawnHandle {
  const cap = opts.stderrCapBytes ?? 16_384;
  const launcher = resolveLauncher(command, args);
  const stdio = (opts.stdio ?? ['ignore', 'pipe', 'pipe']) as ('ignore' | 'inherit' | 'pipe')[];
  const child = spawn(launcher.command, launcher.args as string[], {
    stdio,
    shell: false,
    detached: process.platform !== 'win32',
    // On Windows the cmd.exe launcher needs verbatim args; see spawnArgv.
    windowsVerbatimArguments: process.platform === 'win32',
    // CRITICAL: do not set `env` — see comment in spawnArgv.
  });
  const stderrChunks: Buffer[] = [];
  let stderrBytes = 0;
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrBytes = pushBoundedStderr(stderrChunks, stderrBytes, chunk, cap);
  });

  let disposed = false;

  return {
    pid: child.pid ?? 0,
    child,
    async *readline() {
      if (!child.stdout) return;
      let buf = '';
      for await (const chunk of child.stdout as AsyncIterable<Buffer>) {
        buf += chunk.toString('utf8');
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          yield buf.slice(0, nl);
          buf = buf.slice(nl + 1);
        }
      }
      if (buf.length > 0) yield buf;
    },
    stderrTail: () => Buffer.concat(stderrChunks as unknown as Uint8Array[]).toString('utf8'),
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (child.pid === undefined) return;
      if (process.platform === 'win32') {
        // Windows has no real signals: child.kill() is TerminateProcess on the
        // *immediate* child only. Our immediate child is the cmd.exe launcher,
        // so child.kill() leaves grandchildren (pnpm → tsx → node → vite dev
        // server) running as orphans, holding ports and file handles. Walk
        // the tree with taskkill /T /F — same approach scripts/gauntlet.ts
        // uses for the same reason. /F is acceptable here: the SIGINT-grace
        // path was already a lie on Windows (no signal was ever delivered).
        try {
          execSync(`taskkill /T /F /PID ${child.pid}`, { stdio: 'ignore' });
        } catch (err) {
          if (!isProcessGoneError(err)) {
            throw IoError('spawn.dispose', `taskkill failed for pid ${child.pid}`, { cause: err });
          }
          // already gone — disposal raced the tree's own exit.
        }
        return;
      }
      if (child.exitCode !== null || child.signalCode !== null) return;
      // POSIX: each long-lived child gets its own process group. Signal the
      // group so launchers and their descendants are disposed together.
      const signalGroup = (signal: NodeJS.Signals): void => {
        try {
          process.kill(-child.pid!, signal);
        } catch {
          child.kill(signal);
        }
      };

      // SIGINT first (graceful). Wait up to 2s. If still alive, SIGKILL.
      try {
        signalGroup('SIGINT');
      } catch {
        return;
      }
      await Promise.race([
        new Promise<boolean>((r) => child.once('close', () => r(true))),
        new Promise<boolean>((r) => setTimeout(() => r(false), 2000)),
      ]);
      try {
        signalGroup('SIGKILL');
      } catch (err) {
        if (!isProcessGoneError(err)) {
          throw IoError('spawn.dispose', `SIGKILL failed for pid ${child.pid}`, { cause: err });
        }
        // already dead between the liveness check and this kill — the designed race.
      }
    },
  };
}

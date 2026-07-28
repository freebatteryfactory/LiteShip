/**
 * Cold-buildable subprocess launcher kernel.
 *
 * This is the cold-buildable portion of the command host: it owns Windows shim
 * resolution and inherited-environment additions without importing any workspace
 * workspace package. Its one third-party process dependency, `cross-spawn`, is
 * declared directly so the repository's native TypeScript bootstrap can import
 * this source before `@liteship/command` dist exists.
 *
 * @module
 */

import { createRequire } from 'node:module';
import type { ChildProcess, SpawnOptions } from 'node:child_process';

type CrossSpawn = (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
const crossSpawn = createRequire(import.meta.url)('cross-spawn') as CrossSpawn;

/** Result of a one-shot visible spawn. */
export interface SpawnResult {
  readonly exitCode: number;
  readonly stderrTail: string;
}

/** Captured result used by cold-build repository bootstrap tools. */
export interface BootstrapCaptureResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  /** Native termination signal; null for an ordinary process exit. */
  readonly signal: NodeJS.Signals | null;
  /** True when the caller's `timeoutMs` budget expired and the child was killed. */
  readonly timedOut: boolean;
}

/** Exact platform launcher invocation. */
export interface Launcher {
  readonly command: string;
  readonly args: readonly string[];
  readonly windowsVerbatimArguments: boolean;
}

/**
 * Render one argv token for legacy diagnostics and compatibility tests.
 *
 * This is not a process-launch security boundary. Live launches pass an argv
 * tuple to `cross-spawn` with `shell: false`; they never concatenate this string.
 */
export function quoteWindowsArg(arg: string): string {
  if (arg.length === 0) return '""';
  if (!/[\s"&|<>^();]/u.test(arg)) return arg;
  return `"${arg.replaceAll('"', '\\"')}"`;
}

/**
 * Preserve the authored argv tuple. Cross-platform executable/shebang/shim
 * resolution belongs to `cross-spawn`; LiteShip never assembles a shell command.
 */
export function resolveLauncher(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): Launcher {
  void platform;
  return { command, args, windowsVerbatimArguments: false };
}

/** Launch one argv tuple without exposing a shell-command string to the host. */
export function spawnCrossPlatform(command: string, args: readonly string[], options: SpawnOptions): ChildProcess {
  return crossSpawn(command, args, { ...options, shell: false });
}

/** Merge tool-specific variables without dropping parent coverage/toolchain state. */
export function mergedEnv(additions: Readonly<Record<string, string>> | undefined): NodeJS.ProcessEnv | undefined {
  return additions === undefined ? undefined : { ...process.env, ...additions };
}

/**
 * Run a visible child through the canonical launcher. Stdout is routed to parent
 * stderr so JSON-producing callers retain stdout ownership.
 */
export function spawnArgvVisibleWithEnv(
  command: string,
  args: readonly string[],
  opts: { readonly cwd?: string; readonly envAdditions?: Readonly<Record<string, string>> } = {},
): Promise<SpawnResult> {
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawnCrossPlatform(launcher.command, launcher.args, {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: false,
      cwd: opts.cwd,
      windowsVerbatimArguments: launcher.windowsVerbatimArguments,
      env: mergedEnv(opts.envAdditions),
    });
    proc.stdout?.pipe(process.stderr, { end: false });
    proc.on('error', rejectPromise);
    proc.on('close', (code) => {
      resolvePromise({ exitCode: code ?? 1, stderrTail: '' });
    });
  });
}

/** Public host-compatible visible spawn with ordinary inherited environment. */
export function spawnArgvVisible(
  command: string,
  args: readonly string[],
  opts: { readonly cwd?: string } = {},
): Promise<SpawnResult> {
  return spawnArgvVisibleWithEnv(command, args, opts);
}

/**
 * Capture a cold-build child while merging bounded tool-specific environment
 * additions over the parent. This stays outside the public command-host API:
 * repository bootstrap tools need it before workspace declarations exist.
 */
export function spawnArgvCaptureWithEnv(
  command: string,
  args: readonly string[],
  opts: {
    readonly cwd?: string;
    readonly envAdditions?: Readonly<Record<string, string>>;
    /** Hard child budget; on expiry the child is killed and the result reports `timedOut`. */
    readonly timeoutMs?: number;
  } = {},
): Promise<BootstrapCaptureResult> {
  if (opts.timeoutMs !== undefined && (!Number.isInteger(opts.timeoutMs) || opts.timeoutMs <= 0)) {
    return Promise.reject(
      new Error(`timeoutMs must be a positive integer of milliseconds, got ${JSON.stringify(opts.timeoutMs)}`),
    );
  }
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;
    let settled = false;
    const timers: NodeJS.Timeout[] = [];
    const proc = spawnCrossPlatform(launcher.command, launcher.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      cwd: opts.cwd,
      windowsVerbatimArguments: launcher.windowsVerbatimArguments,
      env: mergedEnv(opts.envAdditions),
    });
    const settle = (result: () => BootstrapCaptureResult | Error): void => {
      if (settled) return;
      settled = true;
      for (const timer of timers) clearTimeout(timer);
      const outcome = result();
      if (outcome instanceof Error) rejectPromise(outcome);
      else resolvePromise(outcome);
    };
    const captured = (code: number | null, signal: NodeJS.Signals | null): BootstrapCaptureResult => ({
      exitCode: code ?? 1,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
      signal,
      timedOut,
    });
    const schedule = (delayMs: number, work: () => void): void => {
      const timer = setTimeout(work, delayMs);
      timer.unref();
      timers.push(timer);
    };
    if (opts.timeoutMs !== undefined) {
      schedule(opts.timeoutMs, () => {
        timedOut = true;
        proc.kill('SIGTERM');
        // A child ignoring SIGTERM must still die inside the caller's turn.
        schedule(2_000, () => proc.kill('SIGKILL'));
        // A grandchild that inherited the pipes can outlive the child and hold
        // 'close' open forever — the exact shape of the 30-minute shard hang.
        // The budget bounds settlement itself: destroy our pipe ends and
        // resolve with whatever was captured.
        schedule(3_000, () => {
          proc.stdout?.destroy();
          proc.stderr?.destroy();
          settle(() => captured(proc.exitCode, proc.signalCode));
        });
      });
    }
    proc.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
    proc.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
    proc.on('error', (error) => settle(() => error));
    proc.on('close', (code, signal) => settle(() => captured(code, signal)));
  });
}

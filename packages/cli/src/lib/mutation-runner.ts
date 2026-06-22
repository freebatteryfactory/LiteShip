/**
 * The DETERMINISTIC, ISOLATED per-mutant test runner (Slice C, the avionics tier
 * — the production half of mutation-as-divergence; `czap check --ir --mutate`).
 *
 * `@czap/audit`'s {@link evaluateMutant} takes an INJECTED runner
 * `(mutatedSource, coveringTests) → { failed }` and never spawns a test process
 * itself — the meta-proof injects a pure stub; PRODUCTION injects THIS. For ONE
 * mutant this runner:
 *
 *   1. BACKS UP the original source file's exact bytes (a `Buffer`, not a decoded
 *      string — a byte-exact restore, never a re-encode).
 *   2. WRITES the mutated source to the file IN PLACE (the splice
 *      {@link evaluateMutant} already computed).
 *   3. Runs ONLY the `coveringTests` via a vitest SUBPROCESS (`vitest run <files>
 *      --no-coverage --reporter=dot`, NO watch). A clean process per mutant is the
 *      ISOLATION boundary: no cross-mutant state leak, no module-cache carry-over —
 *      deterministic by construction. The mutant currently on disk is the only
 *      variable.
 *   4. Reads pass/fail from the EXIT CODE: `0` = every covering test passed (the
 *      mutant SURVIVED → `failed: false`); non-zero = a covering test failed (the
 *      mutant was KILLED → `failed: true`).
 *   5. ALWAYS restores the original bytes in a `finally`, then VERIFIES the restore
 *      (re-reads and byte-compares). A crash, a kill, a throw — NONE may leave a
 *      mutated source on disk. This is the safety keystone: the runner mutates REAL
 *      trust-spine files, so a left-behind mutation would corrupt the working tree.
 *
 * DETERMINISM. The subprocess is launched with `shell: false`, a fixed argv, a
 * fixed `cwd` (the repo root), and the inherited environment plus a pinned
 * `CI=1` / single-process vitest pool (`--pool=forks --no-file-parallelism` — vitest 4
 * REMOVED the old `--poolOptions.forks.singleFork` flag, which CAC now rejects)
 * so the run is reproducible and never races itself. Mutants are evaluated
 * SEQUENTIALLY by the host (the in-place mutate FORBIDS concurrency — two mutants
 * cannot share the file at once); this runner is the per-mutant primitive, never
 * invoked concurrently.
 *
 * ERROR DISCRIMINATION (the anti-lie keystone). A vitest exit code is `0` (pass)
 * or `1` (test failures). Any OTHER outcome — the binary could not be spawned
 * (`spawnSync` error), a signal kill, or a non-`{0,1}` exit (a config/parse/infra
 * fault) — is NOT a "killed" verdict: reporting infra failure as a kill would be a
 * LIE (it would inflate the mutation score with mutants nothing actually caught).
 * Such cases throw a tagged {@link IoError} so the run aborts loudly rather than
 * minting a false verdict. The restore still runs first (the `finally`).
 *
 * @module
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IoError } from '@czap/error';
import type { MutantTestRunner } from '@czap/audit';

/**
 * The synchronous subprocess outcome the runner reads — the discriminated subset of
 * `spawnSync`'s return the verdict logic needs. The injection seam (below) defaults
 * to a real `spawnSync` vitest launch; a test substitutes a deterministic stub to
 * prove the restore/verdict logic without paying for (or flaking on) a real suite
 * run. Composition over inheritance: the runner is a function over this open
 * contract, not a class with a mockable method.
 */
export interface MutationSubprocessResult {
  /** The exit code, or `null` when the process was killed by a signal / never ran. */
  readonly status: number | null;
  /** The signal that killed the process, or `null`. A non-null signal = infra fault. */
  readonly signal: NodeJS.Signals | null;
  /** A spawn-level error (binary not found, EACCES) — an infra fault when present. */
  readonly error?: Error | undefined;
  /** Captured stderr (for the infra-fault message tail). */
  readonly stderr: string | null;
}

/**
 * The subprocess launcher the runner uses — injected so the safety proof can drive
 * the exact outcome (pass / test-failure / infra fault) deterministically. Defaults
 * to {@link defaultVitestSpawn} (a real `vitest run` subprocess). A test stub must
 * NOT touch the filesystem — the runner's own write/restore is what is under test.
 */
export type MutationSubprocessSpawn = (
  repoRoot: string,
  config: string,
  coveringTests: readonly string[],
  timeoutMs: number,
) => MutationSubprocessResult;

/**
 * The vitest exit codes this runner UNDERSTANDS as a verdict. `0` = all covering
 * tests passed (mutant survived); `1` = at least one covering test failed (mutant
 * killed). Any other code is an infra fault, not a verdict (see the module doc).
 */
const VITEST_PASS = 0;
const VITEST_TEST_FAILURE = 1;

/** Options for {@link makeVitestMutationRunner}. */
export interface VitestMutationRunnerOptions {
  /**
   * The vitest config the subprocess runs under — defaults to the repo's root
   * `vitest.config.ts` (the same config the full suite uses, so a mutant's
   * covering tests run EXACTLY as they do normally). Repo-relative.
   */
  readonly config?: string;
  /**
   * Per-mutant subprocess wall-clock cap (ms). A wedged covering test (e.g. an
   * infinite loop a mutation introduced) must not hang the whole run; on timeout
   * the subprocess is killed and the mutant is treated as an INFRA fault (a tagged
   * throw), NEVER a silent kill/survive. Defaults to 5 minutes.
   */
  readonly timeoutMs?: number;
  /**
   * The absolute path to the source file to back up + mutate + restore. The
   * mutated source the runner receives is the WHOLE file's content (the splice
   * {@link evaluateMutant} computed), so the runner overwrites this one file. The
   * host scopes one runner instance per target file; mutants for OTHER files use
   * their own instance. Repo-relative.
   */
  readonly targetFile: string;
  /**
   * The subprocess launcher (defaults to a real `vitest run`). Injected ONLY by the
   * runner's own safety proof, to drive the exact pass/fail/infra outcome
   * deterministically while still exercising the real write/restore/verify path.
   */
  readonly spawn?: MutationSubprocessSpawn;
}

/**
 * Build a deterministic, isolated, self-restoring per-mutant vitest runner for ONE
 * target file. The returned {@link MutantTestRunner} is the production injection for
 * {@link evaluateMutant}: it writes the mutated source to `targetFile` in place,
 * runs the covering tests in a clean vitest subprocess, reads the verdict from the
 * exit code, and ALWAYS restores the original bytes (verified) in a `finally`.
 *
 * @param repoRoot The repo root the subprocess runs in (the fixed `cwd`).
 * @param options  The target file (mutated in place) + the config / timeout knobs.
 */
export function makeVitestMutationRunner(repoRoot: string, options: VitestMutationRunnerOptions): MutantTestRunner {
  const config = options.config ?? 'vitest.config.ts';
  const timeoutMs = options.timeoutMs ?? 300_000;
  const absTarget = resolve(repoRoot, options.targetFile);
  const spawn = options.spawn ?? defaultVitestSpawn;

  return (mutatedSource: string, coveringTests: readonly string[]): { readonly failed: boolean } => {
    // 1. Back up the ORIGINAL bytes (a Buffer — byte-exact, never a re-encode).
    let original: Buffer;
    try {
      original = readFileSync(absTarget);
    } catch (cause) {
      throw IoError(
        'makeVitestMutationRunner',
        `cannot read the target source "${options.targetFile}" to back it up before mutation — refusing to run (a missing original means the restore could not be verified)`,
        { path: absTarget, cause },
      );
    }

    try {
      // 2. Write the mutated source IN PLACE.
      writeFileSync(absTarget, mutatedSource, 'utf8');

      // 3. Run ONLY the covering tests in a clean vitest subprocess (the isolation
      //    boundary). `shell: false` (argv array), fixed cwd, single-process pool
      //    (`--pool=forks --no-file-parallelism`) so a mutant run never races itself —
      //    deterministic by construction.
      const exit = runCoveringTests(spawn, repoRoot, config, coveringTests, timeoutMs, options.targetFile);

      // 4. Read the verdict from the exit code. 0 → all passed → SURVIVED; 1 → a
      //    covering test failed → KILLED. Any other outcome already threw.
      return { failed: exit === VITEST_TEST_FAILURE };
    } finally {
      // 5. ALWAYS restore the original bytes, then VERIFY the restore. The restore
      //    runs even if the subprocess threw (infra fault) or the process is being
      //    torn down — a mutated trust-spine file must NEVER survive this call.
      restoreAndVerify(absTarget, original, options.targetFile);
    }
  };
}

/**
 * The default subprocess launcher — a real `vitest run` over the covering tests in a
 * clean process (`shell: false` argv, fixed cwd, single-process pool
 * `--pool=forks --no-file-parallelism`, `CI=1`), the deterministic isolation boundary.
 * Production injection for {@link MutationSubprocessSpawn}.
 */
function defaultVitestSpawn(
  repoRoot: string,
  config: string,
  coveringTests: readonly string[],
  timeoutMs: number,
): MutationSubprocessResult {
  const args = [
    'vitest',
    'run',
    '--config',
    config,
    '--no-coverage',
    '--reporter=dot',
    // Forks pool with NO file parallelism — one file at a time, no worker race — so
    // the per-mutant run is deterministic and never races itself (the file is mutated
    // in place). vitest 4 REMOVED the `--poolOptions.forks.singleFork` CLI flag (CAC
    // rejects it as an unknown option → exit 1, which this runner would MISREAD as a
    // test-failure "kill" — a false verdict); `--no-file-parallelism` is the vitest-4
    // single-process equivalent.
    '--pool=forks',
    '--no-file-parallelism',
    ...coveringTests,
  ];
  const result = spawnSync('pnpm', ['exec', ...args], {
    cwd: repoRoot,
    // Pin CI=1 so vitest uses its non-interactive, deterministic reporter path and
    // never opens a watch/TTY prompt; inherit the rest of the environment so the
    // toolchain (node, pnpm) resolves exactly as a normal suite run.
    env: { ...process.env, CI: '1' },
    encoding: 'utf8',
    timeout: timeoutMs,
    // Bound captured output so a noisy covering test cannot exhaust memory.
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
  return {
    status: result.status,
    signal: result.signal,
    error: result.error,
    stderr: result.stderr,
  };
}

/**
 * Run the covering tests via the injected spawn and return the exit code,
 * discriminated to the verdict codes. A spawn error, a signal kill, a timeout, or
 * any exit code that is neither `0` nor `1` is an INFRA fault — a tagged throw, not
 * a verdict (reporting infra failure as a kill would inflate the score with a lie).
 */
function runCoveringTests(
  spawn: MutationSubprocessSpawn,
  repoRoot: string,
  config: string,
  coveringTests: readonly string[],
  timeoutMs: number,
  targetFile: string,
): number {
  const result = spawn(repoRoot, config, coveringTests, timeoutMs);

  // A spawn-level error (binary not found, EACCES) → infra fault, never a verdict.
  if (result.error !== undefined && result.error !== null) {
    throw IoError(
      'makeVitestMutationRunner',
      `the vitest subprocess for "${targetFile}" failed to spawn — an infra fault, not a kill/survive verdict (refusing to mint a false verdict)`,
      { cause: result.error },
    );
  }
  // A signal kill (including a timeout SIGTERM) → infra fault, never a verdict.
  if (result.signal !== null) {
    throw IoError(
      'makeVitestMutationRunner',
      `the vitest subprocess for "${targetFile}" was killed by signal ${result.signal} (likely the ${timeoutMs}ms per-mutant timeout) — an infra fault, not a kill/survive verdict`,
      { path: targetFile },
    );
  }
  const code = result.status;
  // A null status with no signal is an impossible spawnSync state; an exit code
  // that is neither pass nor test-failure (e.g. a vitest config/parse error, code
  // 2+) is an infra fault, NOT a kill — discriminate it loudly.
  if (code === VITEST_PASS || code === VITEST_TEST_FAILURE) {
    return code;
  }
  throw IoError(
    'makeVitestMutationRunner',
    `the vitest subprocess for "${targetFile}" exited with code ${String(code)} (neither pass=0 nor test-failure=1) — an infra/config fault, not a kill/survive verdict. stderr tail: ${tail(result.stderr)}`,
    { path: targetFile },
  );
}

/**
 * Restore the original bytes to `absTarget` and VERIFY the restore byte-for-byte.
 * A failed restore (the write threw, or the bytes on disk differ from the backup)
 * is a tagged throw — a mutated trust-spine file left on disk is the worst failure
 * class this runner can produce, so it can never be swallowed.
 */
function restoreAndVerify(absTarget: string, original: Buffer, targetFile: string): void {
  try {
    writeFileSync(absTarget, original);
  } catch (cause) {
    throw IoError(
      'makeVitestMutationRunner',
      `FAILED to restore the original bytes of "${targetFile}" after a mutation — the working tree may hold a mutated source. Restore it from git before re-running.`,
      { path: absTarget, cause },
    );
  }
  const afterRestore = readFileSync(absTarget);
  if (!afterRestore.equals(original)) {
    throw IoError(
      'makeVitestMutationRunner',
      `the restore of "${targetFile}" did not reproduce the original bytes — the working tree holds a divergent source. Restore it from git before re-running.`,
      { path: absTarget },
    );
  }
}

/** A short tail of captured stderr for an infra-fault message (never the full dump). */
function tail(stderr: string | null): string {
  if (stderr === null || stderr.length === 0) return '<empty>';
  const trimmed = stderr.trimEnd();
  return trimmed.length <= 500 ? trimmed : `…${trimmed.slice(trimmed.length - 500)}`;
}

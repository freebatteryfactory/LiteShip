/**
 * The DETERMINISTIC, ISOLATED per-mutant test runner (Slice C, the avionics tier
 * — the production half of mutation-as-divergence; `liteship check --ir --mutate`).
 *
 * `@liteship/audit`'s {@link evaluateMutant} takes an INJECTED runner
 * `(mutatedSource, coveringTests) → { failed }` and never spawns a test process
 * itself — the meta-proof injects a pure stub; PRODUCTION injects THIS. For ONE
 * mutant this runner:
 *
 *   1. BACKS UP the original source file's exact bytes (a `Buffer`, not a decoded
 *      string — a byte-exact restore, never a re-encode).
 *   2. WRITES the mutated source to the file IN PLACE (the splice
 *      {@link evaluateMutant} already computed).
 *   3. Runs ONLY the `coveringTests` via a vitest SUBPROCESS (`vitest run <files>
 *      --no-coverage --reporter=json`, NO watch). A clean process per mutant is the
 *      ISOLATION boundary: no cross-mutant state leak, no module-cache carry-over —
 *      deterministic by construction. The mutant currently on disk is the only
 *      variable.
 *   4. Reads the verdict from vitest's CONFIRMED structured report (not a bare exit
 *      code): ≥1 test must have ACTUALLY EXECUTED, then `numFailedTests > 0` = a
 *      covering test failed (the mutant was KILLED → `failed: true`); all passed = the
 *      mutant SURVIVED → `failed: false`. The exit code is a cross-check, never the
 *      sole signal (see ERROR DISCRIMINATION).
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
 * ERROR DISCRIMINATION (the anti-lie keystone — the CACError scar made permanent).
 * The verdict is keyed on vitest's CONFIRMED structured report, NEVER a bare exit
 * code. The scar: a runner that read "exit 1 = killed" misread a removed-CLI-flag
 * rejection (CAC exits 1) as 56 kills — a fabricated `1.0` score from a run that
 * executed zero tests. Keying on the exit code cannot tell a test-assertion failure
 * from a config/parse/load fault that also exits 1, nor a real survivor from an
 * exit-0 run that executed NO tests. So a verdict is minted ONLY when: the subprocess
 * spawned and was not signal-killed; a `--reporter=json` report PARSES; `numTotalTests
 * > 0` (the mutant was actually exercised); and the exit code AGREES with the report.
 * Every other outcome — spawn error, signal/timeout kill, no parseable report, a
 * 0-test run, or an exit/report disagreement — throws a tagged {@link IoError} so the
 * run aborts loudly rather than laundering a false verdict. The restore still runs
 * first (the `finally`).
 *
 * @module
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IoError } from '@liteship/error';
import type { MutantTestRunner } from '@liteship/audit';

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
  /**
   * Captured stdout — carries vitest's `--reporter=json` structured report (the
   * VERDICT source of truth: confirmed test counts, not a bare exit code). A run
   * that produced no parseable report never actually executed tests → infra fault.
   */
  readonly stdout: string | null;
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
      // 4. The verdict is keyed on the CONFIRMED structured report (≥1 test executed,
      //    numFailedTests > 0 → KILLED), cross-checked against the exit code. A run
      //    that executed 0 tests, produced no parseable report, or whose exit code
      //    disagrees with its report already threw an infra fault — never a false
      //    verdict. Any other outcome already threw.
      return runCoveringTests(spawn, repoRoot, config, coveringTests, timeoutMs, options.targetFile);
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
    // `--reporter=json` writes a structured report (numTotalTests/numFailedTests) to
    // stdout — the VERDICT source of truth. Keying on confirmed test COUNTS, not the
    // bare exit code, is the anti-lie keystone: a run that executed 0 tests, or that
    // exited 1 for a non-assertion reason (a config/parse fault, a module that failed
    // to load), produces no trustworthy pass/fail and is rejected as an infra fault
    // rather than minting a false survived/killed.
    '--reporter=json',
    // Forks pool with NO file parallelism — one file at a time, no worker race — so
    // the per-mutant run is deterministic and never races itself (the file is mutated
    // in place). vitest 4 REMOVED the `--poolOptions.forks.singleFork` CLI flag (CAC
    // rejects it as an unknown option → exit 1); `--no-file-parallelism` is the
    // vitest-4 single-process equivalent.
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
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/**
 * Run the covering tests via the injected spawn and return the VERDICT, keyed on
 * vitest's CONFIRMED structured report — never a bare exit code. The anti-lie
 * keystone (the CACError scar): a mutation runner that reads "exit 1 = killed"
 * misreads ANY exit-1 cause (a removed CLI flag, a config/parse fault, a module that
 * failed to load) as a kill, and an exit-0 run that executed ZERO tests as a survivor
 * — both false verdicts that silently corrupt the mutation score. So the verdict
 * requires:
 *   1. the subprocess spawned + was not signal-killed (else infra fault),
 *   2. a PARSEABLE `--reporter=json` report (else the run produced no trustworthy
 *      result → infra fault),
 *   3. ≥1 test ACTUALLY EXECUTED (`numTotalTests > 0`; a 0-test run never exercised
 *      the mutant → infra fault, never a survived/killed), and
 *   4. the exit code AGREES with the report (failed ⇔ exit 1) — a disagreement is an
 *      inconsistent run, not a trustworthy verdict.
 * Only then is `failed = numFailedTests > 0` minted. Every other path throws a tagged
 * {@link IoError} so the run aborts loudly rather than laundering a false verdict.
 */
function runCoveringTests(
  spawn: MutationSubprocessSpawn,
  repoRoot: string,
  config: string,
  coveringTests: readonly string[],
  timeoutMs: number,
  targetFile: string,
): { readonly failed: boolean } {
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

  // The structured report is the verdict source of truth — NOT the exit code.
  const report = parseVitestReport(result.stdout);
  if (report === null) {
    throw IoError(
      'makeVitestMutationRunner',
      `the vitest subprocess for "${targetFile}" (exit ${String(result.status)}) produced no parseable --reporter=json report — the run did not yield a trustworthy pass/fail (a config/parse/load fault, NOT a kill/survive verdict). stderr tail: ${tail(result.stderr)}`,
      { path: targetFile },
    );
  }
  // CONFIRM tests actually executed. A 0-test run (no covering test matched, or every
  // covering test errored at load) never exercised the mutant — scoring it survived
  // OR killed would be a lie. This is the false-survivor guard the bare exit code
  // could never give (vitest exits 0 on "no tests run").
  if (report.total === 0) {
    throw IoError(
      'makeVitestMutationRunner',
      `the vitest subprocess for "${targetFile}" executed 0 covering tests — the mutant was never exercised, so neither survived nor killed is a truthful verdict (refusing to mint one). Covering tests: ${coveringTests.length === 0 ? '<none supplied>' : coveringTests.join(', ')}`,
      { path: targetFile },
    );
  }
  const failed = report.failed > 0;
  // Cross-check the exit code agrees with the structured report. They should be
  // redundant (a failed test ⇒ exit 1); a DISAGREEMENT means the run was inconsistent
  // (e.g. a non-test error alongside passing tests) → not a trustworthy verdict.
  const code = result.status;
  const exitAgrees = failed ? code === VITEST_TEST_FAILURE : code === VITEST_PASS;
  if (!exitAgrees) {
    throw IoError(
      'makeVitestMutationRunner',
      `the vitest subprocess for "${targetFile}" exited ${String(code)} but its JSON report says ${report.failed}/${report.total} tests failed — exit code and report disagree, so the run is inconsistent (not a trustworthy verdict). stderr tail: ${tail(result.stderr)}`,
      { path: targetFile },
    );
  }
  return { failed };
}

/**
 * Parse vitest's `--reporter=json` stdout into the confirmed test counts the verdict
 * needs (`numTotalTests`/`numFailedTests`, Jest-compatible). Returns `null` when the
 * stdout carries no parseable report object or the count fields are absent/non-numeric
 * — the caller treats `null` as an infra fault (the run produced no trustworthy
 * result), NEVER a survived/killed verdict. The report object is extracted from the
 * outermost `{…}` so a stray banner line cannot defeat the parse.
 */
function parseVitestReport(stdout: string | null): { readonly total: number; readonly failed: number } | null {
  if (stdout === null || stdout.length === 0) return null;
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.slice(start, end + 1));
  } catch (err) {
    // JSON.parse throws ONLY SyntaxError ⇒ the stdout's brace block was not a real
    // report (e.g. a CLI-arg rejection that printed a `{…}`-shaped diagnostic) ⇒ null,
    // which the caller surfaces as a discriminated infra fault (NEVER a verdict). The
    // binding is CONSUMED by discriminating it: anything that is NOT a SyntaxError is an
    // impossible VM-level fault, rethrown loud rather than swallowed into a false null.
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const total = record['numTotalTests'];
  const failed = record['numFailedTests'];
  if (typeof total !== 'number' || typeof failed !== 'number') return null;
  return { total, failed };
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

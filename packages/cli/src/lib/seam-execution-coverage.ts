/**
 * EXECUTION-BASED covering-tests coverage for the L4 mutation cannon (Slice C, the
 * avionics tier — the FIX for the barrel problem).
 *
 * THE BARREL PROBLEM. {@link buildSeamCoverageMap}'s sound covering model is the
 * union of (a) DEEP-importers of a seam's source path and (b) BARREL-importers of
 * the seam's package (`@czap/core`). (b) is sound but over-broad: ~220 tests import
 * `@czap/core`, so every broad-package L4 seam (hlc / dag / content-address) maps to
 * ALL ~220 — ~220 subprocess suite runs PER MUTANT. The broad seams were deferred
 * for exactly this reason.
 *
 * THE SOUND, TRACTABLE FIX (this module). A barrel-importer is kept for seam F iff,
 * WHEN RUN, it actually EXECUTES code in F — not merely imports F transitively. The
 * filter is computed per (test, seam) by running the test ONCE under vitest with v8
 * coverage SCOPED to F (`--coverage.include=<F>`), then reading the istanbul
 * `coverage-final.json` v8 produces and inspecting the per-FUNCTION hit map.
 *
 * WHY FUNCTION COVERAGE, NOT STATEMENT COVERAGE (the soundness keystone). Importing
 * a barrel transitively imports F, and v8 counts F's TOP-LEVEL module-init statements
 * (the `const X = ...` declarations that run on import) as "covered" even when no
 * test ever calls into F. Statement coverage therefore CANNOT distinguish "executed
 * F's logic" from "merely imported F". The per-FUNCTION hit map can: a test that only
 * imports F covers 0 of F's functions; a test that exercises F covers ≥1. (Proven on
 * this repo: an unrelated `@czap/core` barrel importer shows 11/64 statements but
 * 0/13 FUNCTIONS of `hlc.ts` covered — pure import-time init — while `hlc.test.ts`
 * shows 13/13.)
 *
 * THE LINE-GRANULAR, SOUND MAP. The fix is applied at LINE granularity so it is sound
 * even for the rare mutable TOP-LEVEL expression (a relational/arithmetic operator at
 * module scope, executed on import but inside no function):
 *   - A seam line INSIDE a covered function's `[startLine, endLine]` range maps to the
 *     EXECUTING tests (the precise, tractable signal) PLUS every deep-importer.
 *   - A seam line OUTSIDE every function range (a top-level line — module-init,
 *     executed on import by every barrel importer) maps to the FULL sound barrel set
 *     PLUS the deep-importers. Under-mapping a top-level mutant would be a false
 *     survivor, so for those lines the conservative barrel closure is retained — the
 *     vast majority of mutants live in function bodies, so tractability is preserved
 *     where it matters without weakening soundness where it does not.
 *
 * SOUNDNESS STATEMENT (load-bearing). A test EXCLUDED from a function-body line of F
 * provably never executes any function of F (0 function hits under a scoped coverage
 * run), so it could never observe — and therefore never kill — a mutant in F's
 * function bodies. The exclusion can only ever drop a test that could not have killed
 * the mutant. (The one residual — a test that enters F's function but whose
 * assertions ignore the mutated behaviour — is a SURVIVOR, correctly surfaced, not a
 * false negative.)
 *
 * DETERMINISM. Each probe is a single test file under `--pool=forks
 * --no-file-parallelism` (vitest 4 REMOVED the old `--poolOptions.forks.singleFork`
 * flag, which CAC now rejects — see the spawn site below), a fixed config, `CI=1`, and a per-probe coverage
 * reports directory (no cross-probe interference). The covered-function ranges are a
 * pure function of the test bytes + the seam bytes + the toolchain — the SAME inputs
 * yield the SAME ranges. The result is CACHED (the B2 pattern) against the toolchain
 * digest + the seam-bytes digest + the test-bytes digest, so a probe re-runs only
 * when the toolchain, the seam, or the test changes — amortizing the one-time cost.
 *
 * NO new dependency: `@vitest/coverage-v8` is already a devDep (the repo's coverage
 * provider) and `istanbul-lib-coverage` already ships (the merge-coverage gate). The
 * v8 provider emits the istanbul `coverage-final.json` shape this module reads.
 *
 * @module
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { AddressedDigest, CanonicalCbor } from '@czap/core';
import { normalizeRepoPath, type MutationTargetFile } from '@czap/audit';
import { IoError } from '@czap/error';

/**
 * The injected probe launcher — runs ONE test file under vitest with v8 coverage
 * scoped to ONE seam source path, and returns the covered-function LINE RANGES of
 * that seam (`f[id] > 0` ⇒ that function executed). Injected so the determinism
 * self-test can drive the exact covered-ranges deterministically without paying for
 * a real coverage subprocess; production injects {@link defaultCoverageProbe}.
 *
 * Returns `null` when the seam file is ABSENT from the report (the test imported the
 * seam's package but executed NONE of the seam's functions — or did not import it at
 * all): a null result means "covers no function of F" (the test is filtered out of
 * F's function-body lines).
 */
export type SeamCoverageProbe = (
  repoRoot: string,
  config: string,
  seamFile: string,
  testId: string,
  timeoutMs: number,
) => readonly LineRange[] | null;

/**
 * The injected BATCHED probe launcher — runs ONE test file under vitest with v8
 * coverage scoped to MANY seam source paths AT ONCE (multiple `--coverage.include`),
 * returning a `seamFile → covered-function-ranges` map. This is the TRACTABILITY
 * keystone: the ~220 barrel candidates are probed ONCE EACH (one subprocess per test),
 * not once per (test, seam) — collapsing ~660 probe runs into ~220. A seam ABSENT from
 * the returned map (or mapped to `null`) means the test executed none of that seam's
 * functions (filtered out of the seam's function-body lines). Injected so the
 * determinism self-test can drive the batched result deterministically; production
 * injects {@link defaultBatchedCoverageProbe}.
 */
export type BatchedSeamCoverageProbe = (
  repoRoot: string,
  config: string,
  seamFiles: readonly string[],
  testId: string,
  timeoutMs: number,
) => ReadonlyMap<string, readonly LineRange[]>;

/** A 1-based inclusive line range of a covered function in a seam file. */
export interface LineRange {
  /** 1-based first line of the function (inclusive). */
  readonly startLine: number;
  /** 1-based last line of the function (inclusive). */
  readonly endLine: number;
}

/** The injected verdict store for one (test, seam) probe — the B2 cache pattern. */
export interface SeamCoverageProbeCache {
  /** The cached covered-function ranges for `key`, or `null` on a MISS (re-run). */
  read(key: string): readonly LineRange[] | null;
  /** Record the covered-function ranges produced for `key` (`[]` = covers nothing). */
  write(key: string, ranges: readonly LineRange[]): void;
}

/** Options for {@link computeSeamExecutionCoverage} — the injection surface. */
export interface SeamExecutionCoverageOptions {
  /** The repo root the probe subprocess runs in (the fixed `cwd`). */
  readonly repoRoot: string;
  /** The vitest config the probe runs under (repo-relative). Defaults to `vitest.config.ts`. */
  readonly config?: string;
  /**
   * The per-(test, seam) probe launcher (defaults to a real scoped-coverage vitest
   * run). Injected by the determinism self-test; retained for single-seam probing.
   */
  readonly probe?: SeamCoverageProbe;
  /**
   * The BATCHED probe launcher (one subprocess per test, all seams at once) — the
   * tractable production path (defaults to {@link defaultBatchedCoverageProbe}).
   * Injected by the self-test to drive the batched result deterministically.
   */
  readonly batchedProbe?: BatchedSeamCoverageProbe;
  /** The B2 probe cache (the toolchain-keyed amortizer). Omit → every probe runs uncached. */
  readonly cache?: SeamCoverageProbeCache;
  /** The toolchain digest the probe cache keys against (required iff `cache`). */
  readonly toolchainDigest?: string;
  /** Per-probe subprocess wall-clock cap (ms). Defaults to 5 minutes (a probe is one file). */
  readonly timeoutMs?: number;
}

/**
 * The execution-coverage decision for ONE (test, seam) pair — the covered-function
 * ranges (empty when the test executes none of the seam's functions). The per-line
 * map composer ({@link executionCoverageRelation}) reads these.
 */
export interface SeamTestExecution {
  /** The repo-relative test id. */
  readonly testId: string;
  /** The repo-relative seam file id. */
  readonly seamFile: string;
  /** Whether the test DEEP-imports the seam's source path (always kept, all lines). */
  readonly deepImporter: boolean;
  /** Covered-function line ranges of the seam this test executes (`[]` = none). */
  readonly coveredFunctionRanges: readonly LineRange[];
}

/**
 * Compute the per-(test, seam) execution-coverage decisions for the barrel-candidate
 * tests of each seam — the EXECUTION FILTER that fixes the barrel problem.
 *
 * For each seam F:
 *   - DEEP-importers of F (the precise signal) are kept WITHOUT a probe (they
 *     reference F's source directly — they execute it by construction).
 *   - BARREL-importers of F's package are PROBED: run once scoped to F; keep their
 *     covered-function ranges (`[]` when they execute no function of F).
 *
 * The result is the substrate {@link executionCoverageRelation} turns into the
 * sound, tractable, line-granular `(file, line, testId)` relation.
 *
 * @param candidates the per-seam candidate test ids (deep ∪ barrel), from
 *                    {@link partitionSeamCandidates}.
 * @param options    the repo root + the injected probe / cache / toolchain digest.
 */
export function computeSeamExecutionCoverage(
  candidates: readonly SeamCandidates[],
  options: SeamExecutionCoverageOptions,
): readonly SeamTestExecution[] {
  const config = options.config ?? 'vitest.config.ts';
  const timeoutMs = options.timeoutMs ?? 300_000;
  const batchedProbe = options.batchedProbe ?? defaultBatchedCoverageProbe;
  const seamByFile = new Map<string, SeamCandidates>(candidates.map((c) => [c.seamFile, c]));
  const out: SeamTestExecution[] = [];

  // Deep-importers are kept verbatim — no probe (they reference F's source path, so
  // they execute it; probing them would only confirm the obvious and cost a run).
  for (const candidate of candidates) {
    for (const testId of candidate.deepImporters) {
      out.push({ testId, seamFile: candidate.seamFile, deepImporter: true, coveredFunctionRanges: [] });
    }
  }

  // Barrel-importers are PROBED — kept for a seam iff they execute ≥1 of its functions.
  // TRACTABILITY: group the barrel candidates by TEST (one test may be a candidate for
  // several seams), so each test is probed ONCE for ALL its seams (one subprocess per
  // test, not per (test, seam)) — collapsing ~660 probes into ~220.
  const seamsByTest = groupBarrelCandidatesByTest(candidates);
  for (const [testId, perTest] of seamsByTest) {
    // Per (test, seam) cache lookup: only the UNCACHED seams need a fresh probe; a HIT
    // serves the prior ranges (the B2 amortizer keyed on toolchain + seam + test bytes).
    const uncached: { seamFile: string; key: string | null }[] = [];
    const resolved = new Map<string, readonly LineRange[]>();
    for (const seamFile of perTest.seamFiles) {
      const candidate = seamByFile.get(seamFile)!;
      const test = perTest.test;
      const key = cacheKeyFor(options, candidate, test);
      if (key !== null && options.cache !== undefined) {
        const cached = options.cache.read(key);
        if (cached !== null) {
          resolved.set(seamFile, cached);
          continue;
        }
      }
      uncached.push({ seamFile, key });
    }

    // ONE batched subprocess covering every uncached seam this test is a candidate for.
    if (uncached.length > 0) {
      const probed = batchedProbe(
        options.repoRoot,
        config,
        uncached.map((u) => u.seamFile),
        testId,
        timeoutMs,
      );
      for (const u of uncached) {
        const ranges = probed.get(u.seamFile) ?? [];
        resolved.set(u.seamFile, ranges);
        if (u.key !== null && options.cache !== undefined) options.cache.write(u.key, ranges);
      }
    }

    for (const [seamFile, ranges] of resolved) {
      out.push({ testId, seamFile, deepImporter: false, coveredFunctionRanges: ranges });
    }
  }

  // Deterministic order: by seam, then by test id.
  out.sort((a, b) => a.seamFile.localeCompare(b.seamFile) || a.testId.localeCompare(b.testId));
  return out;
}

/** A test's barrel-candidacy across seams — the test + the seam ids it is a candidate for. */
interface PerTestCandidacy {
  readonly test: CandidateTest;
  readonly seamFiles: readonly string[];
}

/**
 * Group the per-seam barrel candidates by TEST id (sorted, deterministic) — the
 * substrate for one-probe-per-test batching. A test that imports `@czap/core` is a
 * barrel candidate for every `@czap/core` seam, so it appears once here with all those
 * seams, and is probed ONCE for all of them.
 */
function groupBarrelCandidatesByTest(candidates: readonly SeamCandidates[]): ReadonlyMap<string, PerTestCandidacy> {
  const byTest = new Map<string, { test: CandidateTest; seams: Set<string> }>();
  for (const candidate of candidates) {
    for (const test of candidate.barrelImporters) {
      const entry = byTest.get(test.id) ?? { test, seams: new Set<string>() };
      entry.seams.add(candidate.seamFile);
      byTest.set(test.id, entry);
    }
  }
  const out = new Map<string, PerTestCandidacy>();
  for (const testId of [...byTest.keys()].sort((a, b) => a.localeCompare(b))) {
    const entry = byTest.get(testId)!;
    out.set(testId, { test: entry.test, seamFiles: [...entry.seams].sort((a, b) => a.localeCompare(b)) });
  }
  return out;
}

/** A barrel-candidate test — its id + bytes (the bytes key the per-probe cache). */
export interface CandidateTest {
  readonly id: string;
  readonly text: string;
}

/** A seam paired with its partitioned candidate tests (deep-import vs barrel-import). */
export interface SeamCandidates {
  /** The repo-relative seam file id. */
  readonly seamFile: string;
  /** The seam's current source bytes (the cache key half). */
  readonly seamText: string;
  /** Test ids that DEEP-import the seam's source path (kept without a probe). */
  readonly deepImporters: readonly string[];
  /** Tests that import the seam's package BARREL (probed for execution). */
  readonly barrelImporters: readonly CandidateTest[];
}

/** The field/record separators for the probe-cache key (US/RS control bytes). */
const UNIT = '';
const RECORD = '';

/**
 * The deterministic probe-cache key — the seam bytes digest, the test bytes digest,
 * and the toolchain digest, each routed through the same `addressedDigestOf`
 * content-addressing the mutation engine uses. A change in the seam, the test, or the
 * toolchain flips the key (→ MISS → re-probe). Returns `null` when caching is not
 * armed (no toolchain digest), so the caller never builds a key without the anti-lie
 * keystone.
 */
function cacheKeyFor(
  options: SeamExecutionCoverageOptions,
  candidate: SeamCandidates,
  test: CandidateTest,
): string | null {
  if (options.toolchainDigest === undefined) return null;
  const seamDigest = AddressedDigest.of(
    CanonicalCbor.encode([candidate.seamFile, candidate.seamText]),
    'blake3',
  ).integrity_digest;
  const testDigest = AddressedDigest.of(CanonicalCbor.encode([test.id, test.text]), 'blake3').integrity_digest;
  return [`seam${UNIT}${seamDigest}`, `test${UNIT}${testDigest}`, `tc${UNIT}${options.toolchainDigest}`].join(RECORD);
}

/**
 * The default coverage probe — a real `vitest run <testId> --coverage` scoped to ONE
 * seam file, reading the covered-function line ranges from the istanbul
 * `coverage-final.json` v8 emits. Deterministic: single test file, single fork,
 * fixed config, `CI=1`, a per-probe coverage reports directory (`mkdtemp`, removed
 * after). Production injection for {@link SeamCoverageProbe}.
 *
 * The scoping is `--coverage.include=<seamFile>` + `--coverage.all=false`, so ONLY
 * the seam file is instrumented and reported (no whole-repo instrumentation cost, no
 * unrelated entries). A spawn fault, a signal kill, a timeout, or a non-zero exit is
 * a tagged throw — an infra fault must never be silently read as "covers nothing"
 * (that would under-map and mint a false survivor); the run aborts loudly.
 */
export function defaultCoverageProbe(
  repoRoot: string,
  config: string,
  seamFile: string,
  testId: string,
  timeoutMs: number,
): readonly LineRange[] | null {
  const reportsDir = mkdtempSync(join(tmpdir(), 'czap-seam-cov-'));
  try {
    const args = [
      'exec',
      'vitest',
      'run',
      '--config',
      config,
      '--coverage',
      '--coverage.provider=v8',
      `--coverage.include=${normalizeRepoPath(seamFile)}`,
      '--coverage.all=false',
      '--coverage.reporter=json',
      `--coverage.reportsDirectory=${reportsDir}`,
      // Forks pool, NO file parallelism — a deterministic single-process probe.
      // vitest 4 REMOVED `--poolOptions.forks.singleFork` (CAC rejects it → exit 1,
      // which this probe would misread as a covering-test failure that still produced
      // no report → a spurious "covers nothing" under-map); `--no-file-parallelism` is
      // the vitest-4 single-process equivalent.
      '--pool=forks',
      '--no-file-parallelism',
      testId,
    ];
    const result = spawnSync('pnpm', args, {
      cwd: repoRoot,
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      shell: false,
    });
    if (result.error !== undefined && result.error !== null) {
      throw IoError(
        'defaultCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" → "${seamFile}" failed to spawn — an infra fault, never a "covers nothing" verdict (refusing to under-map)`,
        { cause: result.error },
      );
    }
    if (result.signal !== null) {
      throw IoError(
        'defaultCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" → "${seamFile}" was killed by signal ${result.signal} (likely the ${timeoutMs}ms probe timeout) — an infra fault, never a "covers nothing" verdict`,
        { path: testId },
      );
    }
    // A probe whose covering test FAILS (exit 1) is still a valid EXECUTION signal —
    // the function-coverage map records what ran regardless of assertions; only an
    // infra/config fault (exit ≥ 2, or a spawn/signal fault above) is a real abort.
    if (result.status !== 0 && result.status !== 1) {
      throw IoError(
        'defaultCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" → "${seamFile}" exited with code ${String(result.status)} (neither pass=0 nor test-failure=1) — an infra/config fault, never a "covers nothing" verdict. stderr tail: ${tail(result.stderr)}`,
        { path: testId },
      );
    }
    const reportPath = join(reportsDir, 'coverage-final.json');
    if (!existsSync(reportPath)) {
      // A v8-coverage run ALWAYS writes coverage-final.json (even for an all-misses
      // scope). Its ABSENCE means the test process never reached the coverage-emit
      // stage — a config/parse/infra fault (e.g. a removed CLI flag CAC rejects with
      // exit 1, or a vitest startup error), NOT a genuine "covers nothing". Reading it
      // as null would UNDER-MAP the seam and mint a false survivor, so this is a tagged
      // throw — the run aborts loudly rather than degrade soundness silently.
      throw IoError(
        'defaultCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" → "${seamFile}" exited ${String(result.status)} but wrote NO coverage-final.json — a config/infra fault (the test never reached coverage emit), never a "covers nothing" verdict (refusing to under-map). stderr tail: ${tail(result.stderr)}`,
        { path: testId },
      );
    }
    return parseCoveredFunctionRanges(readFileSync(reportPath, 'utf8'), seamFile);
  } finally {
    rmSync(reportsDir, { recursive: true, force: true });
  }
}

/**
 * The default BATCHED coverage probe — a real `vitest run <testId> --coverage` scoped
 * to MANY seam files at once (one `--coverage.include` per seam), reading each seam's
 * covered-function ranges from the single istanbul report v8 emits. The TRACTABLE
 * production path: one subprocess per test for ALL its candidate seams, collapsing
 * ~660 single-seam probes into ~220. Same determinism + infra-fault discipline as the
 * single probe (single test file, forks pool, no file parallelism, `CI=1`, a per-probe
 * reports directory removed after); a spawn fault, signal, timeout, or a non-`{0,1}`
 * exit is a tagged throw, and a missing report after a `{0,1}` exit is a tagged throw
 * (a config/infra fault, never a silent "covers nothing" under-map).
 *
 * Returns a `seamFile → ranges` map: a seam present in the report maps to its covered
 * ranges (`[]` when no function of it executed); a seam ABSENT from the report (the
 * test executed none of its functions under `--coverage.all=false`) is OMITTED, which
 * the caller reads as "covers nothing" (`?? []`). Either way the seam is filtered out
 * of its function-body lines — the sound, intended exclusion.
 */
export function defaultBatchedCoverageProbe(
  repoRoot: string,
  config: string,
  seamFiles: readonly string[],
  testId: string,
  timeoutMs: number,
): ReadonlyMap<string, readonly LineRange[]> {
  const reportsDir = mkdtempSync(join(tmpdir(), 'czap-seam-cov-'));
  try {
    const args = [
      'exec',
      'vitest',
      'run',
      '--config',
      config,
      '--coverage',
      '--coverage.provider=v8',
      ...seamFiles.map((s) => `--coverage.include=${normalizeRepoPath(s)}`),
      '--coverage.all=false',
      '--coverage.reporter=json',
      `--coverage.reportsDirectory=${reportsDir}`,
      // Forks pool, NO file parallelism — a deterministic single-process probe. vitest
      // 4 REMOVED `--poolOptions.forks.singleFork` (CAC rejects it → exit 1, misread as
      // a failure that wrote no report → a spurious under-map); `--no-file-parallelism`
      // is the vitest-4 single-process equivalent.
      '--pool=forks',
      '--no-file-parallelism',
      testId,
    ];
    const result = spawnSync('pnpm', args, {
      cwd: repoRoot,
      env: { ...process.env, CI: '1' },
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      shell: false,
    });
    if (result.error !== undefined && result.error !== null) {
      throw IoError(
        'defaultBatchedCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" (seams: ${seamFiles.join(', ')}) failed to spawn — an infra fault, never a "covers nothing" verdict (refusing to under-map)`,
        { cause: result.error },
      );
    }
    if (result.signal !== null) {
      throw IoError(
        'defaultBatchedCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" was killed by signal ${result.signal} (likely the ${timeoutMs}ms probe timeout) — an infra fault, never a "covers nothing" verdict`,
        { path: testId },
      );
    }
    // A failing covering test (exit 1) is still a valid EXECUTION signal — the function
    // map records what ran regardless of assertions; only a non-`{0,1}` exit is a fault.
    if (result.status !== 0 && result.status !== 1) {
      throw IoError(
        'defaultBatchedCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" exited with code ${String(result.status)} (neither pass=0 nor test-failure=1) — an infra/config fault, never a "covers nothing" verdict. stderr tail: ${tail(result.stderr)}`,
        { path: testId },
      );
    }
    const reportPath = join(reportsDir, 'coverage-final.json');
    if (!existsSync(reportPath)) {
      throw IoError(
        'defaultBatchedCoverageProbe',
        `the scoped-coverage vitest probe for "${testId}" exited ${String(result.status)} but wrote NO coverage-final.json — a config/infra fault (the test never reached coverage emit), never a "covers nothing" verdict (refusing to under-map). stderr tail: ${tail(result.stderr)}`,
        { path: testId },
      );
    }
    return parseBatchedCoveredFunctionRanges(readFileSync(reportPath, 'utf8'), seamFiles);
  } finally {
    rmSync(reportsDir, { recursive: true, force: true });
  }
}

/**
 * Parse the per-seam covered-function ranges for MANY seams out of one v8/istanbul
 * report — the batched-probe reader. Each seam is matched by repo-relative suffix
 * against the report's absolute keys; an absent seam is OMITTED from the map (the
 * caller reads that as "covers nothing"). Pure — a function of the report bytes + the
 * seam ids.
 */
export function parseBatchedCoveredFunctionRanges(
  reportJson: string,
  seamFiles: readonly string[],
): ReadonlyMap<string, readonly LineRange[]> {
  const parsed: unknown = JSON.parse(reportJson);
  if (typeof parsed !== 'object' || parsed === null) {
    throw IoError(
      'parseBatchedCoveredFunctionRanges',
      'the coverage report is not a JSON object — refusing to read a malformed report',
      {},
    );
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  const out = new Map<string, readonly LineRange[]>();
  for (const seamFile of seamFiles) {
    const wantSuffix = normalizeRepoPath(seamFile);
    const hit = entries.find(([absFile]) => normalizeRepoPath(absFile).endsWith(wantSuffix));
    if (hit !== undefined) out.set(seamFile, coveredRangesOf(hit[1]));
  }
  return out;
}

/**
 * Parse the covered-function LINE RANGES of `seamFile` out of a v8/istanbul
 * `coverage-final.json`. Returns `null` when the seam file is ABSENT from the report
 * (the test executed no function of it) and `[]` when it is present but every
 * function is unhit. Only functions with a positive hit count contribute a range
 * (`fnMap[id].loc.{start,end}.line`).
 *
 * The istanbul shape is `{ [absFile]: { f: {id:hits}, fnMap: {id:{loc:{start,end}}} } }`.
 * The seam file is matched by repo-relative SUFFIX against the absolute coverage keys
 * (the report keys are absolute paths; the seam is repo-relative).
 */
export function parseCoveredFunctionRanges(reportJson: string, seamFile: string): readonly LineRange[] | null {
  const parsed: unknown = JSON.parse(reportJson);
  if (typeof parsed !== 'object' || parsed === null) {
    throw IoError(
      'parseCoveredFunctionRanges',
      'the coverage report is not a JSON object — refusing to read a malformed report',
      {},
    );
  }
  const wantSuffix = normalizeRepoPath(seamFile);
  for (const [absFile, entryUnknown] of Object.entries(parsed as Record<string, unknown>)) {
    if (!normalizeRepoPath(absFile).endsWith(wantSuffix)) continue;
    return coveredRangesOf(entryUnknown);
  }
  return null;
}

/**
 * Extract the covered-function line ranges from one istanbul file-coverage entry.
 * Reads `f` (the per-function hit counts) and `fnMap` (the per-function locations);
 * a function with a positive hit count contributes its `loc` line range. Defensive:
 * a missing/`null` end line falls back to the start line (a single-line function),
 * never a `NaN` range that could corrupt the line-containment test.
 */
function coveredRangesOf(entryUnknown: unknown): readonly LineRange[] {
  if (typeof entryUnknown !== 'object' || entryUnknown === null) return [];
  const entry = entryUnknown as { f?: Record<string, unknown>; fnMap?: Record<string, unknown> };
  const f = entry.f ?? {};
  const fnMap = entry.fnMap ?? {};
  const ranges: LineRange[] = [];
  for (const [id, hitsUnknown] of Object.entries(f)) {
    if (typeof hitsUnknown !== 'number' || hitsUnknown <= 0) continue;
    const fn = fnMap[id];
    if (typeof fn !== 'object' || fn === null) continue;
    const loc = (fn as { loc?: { start?: { line?: unknown }; end?: { line?: unknown } } }).loc;
    const startLine = numericLine(loc?.start?.line);
    if (startLine === null) continue;
    const endLine = numericLine(loc?.end?.line) ?? startLine;
    ranges.push({ startLine, endLine: Math.max(startLine, endLine) });
  }
  // Deterministic order — sorted by start then end (the relation builder is
  // order-independent, but a stable order keeps the cached artifact byte-stable).
  ranges.sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine);
  return ranges;
}

/** A finite positive integer line number, or `null` (the v8 end line may be null). */
function numericLine(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * Build the SOUND, TRACTABLE per-`(file, line, testId)` coverage relation from the
 * execution decisions — the substrate `makeCoverageMap` folds into the verdict's
 * {@link import('@czap/audit').CoverageMap}.
 *
 * For each seam F (1..`lineCount(F)` lines):
 *   - A line INSIDE any covered-function range of an executing test maps to that
 *     test (the precise, tractable signal). Deep-importers map to EVERY line.
 *   - A line OUTSIDE every covered-function range — a top-level line — maps to the
 *     FULL barrel set (every barrel candidate executes it on import) PLUS the
 *     deep-importers, the sound fallback that never under-maps a top-level mutant.
 *
 * The seam line count comes from `seamLineCount` (the seam bytes). The relation is
 * de-duplicated + sorted downstream by `makeCoverageMap`, so the per-site lists are
 * byte-stable. Pure + deterministic — a function of the executions + the seam line
 * counts only.
 */
export function executionCoverageRelation(
  executions: readonly SeamTestExecution[],
  seamLineCount: ReadonlyMap<string, number>,
): readonly { file: string; line: number; testId: string }[] {
  // Group the executions by seam so each seam's lines resolve from its own tests.
  const bySeam = new Map<string, SeamTestExecution[]>();
  for (const ex of executions) {
    const list = bySeam.get(ex.seamFile) ?? [];
    list.push(ex);
    bySeam.set(ex.seamFile, list);
  }

  const relation: { file: string; line: number; testId: string }[] = [];
  for (const [seamFile, exs] of bySeam) {
    const lineCount = seamLineCount.get(seamFile);
    if (lineCount === undefined) {
      // A seam with executions but no line count is a wiring bug, not data — surfacing
      // it as a throw beats silently emitting no relation (which would no-coverage the
      // whole seam — a false-negative direction).
      throw IoError(
        'executionCoverageRelation',
        `no line count for seam "${seamFile}" — the seam bytes were not supplied to the coverage builder`,
        { path: seamFile },
      );
    }
    const deepImporters = exs.filter((e) => e.deepImporter).map((e) => e.testId);
    const barrelImporters = exs.filter((e) => !e.deepImporter);
    for (let line = 1; line <= lineCount; line++) {
      // Deep-importers cover every line (they reference F's source — sound + precise).
      for (const testId of deepImporters) relation.push({ file: seamFile, line, testId });
      // A barrel importer covers a FUNCTION-BODY line iff it executed a function
      // spanning that line; a TOP-LEVEL line (inside no covered function of ANY test)
      // falls back to the full barrel set (every barrel importer executes it on import).
      const insideSomeCoveredFn = barrelImporters.some((e) => lineInRanges(line, e.coveredFunctionRanges));
      if (insideSomeCoveredFn) {
        for (const e of barrelImporters) {
          if (lineInRanges(line, e.coveredFunctionRanges)) relation.push({ file: seamFile, line, testId: e.testId });
        }
      } else {
        // Top-level (or no-test-covered) line → the sound barrel closure: every barrel
        // candidate runs F's module-init on import, so any of them could observe a
        // top-level mutant. Never under-map this line.
        for (const e of barrelImporters) relation.push({ file: seamFile, line, testId: e.testId });
      }
    }
  }
  return relation;
}

/** True iff 1-based `line` falls within any inclusive `[startLine, endLine]` range. */
function lineInRanges(line: number, ranges: readonly LineRange[]): boolean {
  for (const r of ranges) {
    if (line >= r.startLine && line <= r.endLine) return true;
  }
  return false;
}

/**
 * The fs-backed {@link SeamCoverageProbeCache} rooted at `cwd` — the production half
 * of the B2 content-addressed probe store, mirroring the mutant-verdict cache's
 * sound-MISS discipline. Stores each probe's covered-function ranges as JSON under
 * `.czap/cache/seam-coverage/<keyhash>.json`. A `read` returns `null` (a MISS →
 * re-probe, the SAFE direction) for ANY uncertain case — absent, unreadable, or
 * malformed — so a corrupt/stale/hand-edited entry can never serve a fake coverage
 * decision (under-mapping from a bad cache would mint a false survivor). `write` is
 * ATOMIC (temp + rename) so a crash mid-write never leaves a half file.
 */
export function makeFsSeamCoverageProbeCache(cwd: string = process.cwd()): SeamCoverageProbeCache {
  const dir = join(cwd, '.czap', 'cache', 'seam-coverage');
  return {
    read(key: string): readonly LineRange[] | null {
      const path = probePath(dir, key);
      if (!existsSync(path)) return null;
      let raw: string;
      try {
        raw = readFileSync(path, 'utf8');
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'EACCES' || code === 'EISDIR' || code === 'EPERM') return null;
        throw IoError('seam-coverage-probe-cache.read', `unreadable cache entry (${String(code ?? 'unknown')})`, {
          path,
          cause: err,
        });
      }
      return parseProbeRanges(raw);
    },
    write(key: string, ranges: readonly LineRange[]): void {
      const path = probePath(dir, key);
      mkdirSync(dirname(path), { recursive: true });
      const tmp = `${path}.${process.pid}.${slug(key).slice(0, 8)}.tmp`;
      writeFileSync(tmp, JSON.stringify(ranges), 'utf8');
      renameSync(tmp, path);
    },
  };
}

/** The on-disk path for a probe result keyed by the content-addressed probe key. */
function probePath(dir: string, key: string): string {
  return join(dir, `${slug(key)}.json`);
}

/** Hash the probe KEY into a short filesystem-safe slug (the same fold style as B2). */
function slug(key: string): string {
  return AddressedDigest.of(new TextEncoder().encode(key), 'blake3')
    .display_id.replace(/[^a-z0-9]/gi, '')
    .slice(0, 32);
}

/**
 * Parse a cached probe file into `LineRange[]`, or `null` (a MISS → re-probe) when it
 * is not a well-formed array of `{startLine, endLine}` integer ranges. A half-written
 * file, a hand-edit, or a schema drift parses to `null`, never to a partial/garbage
 * decision that could under-map a seam.
 */
function parseProbeRanges(raw: string): readonly LineRange[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out: LineRange[] = [];
  for (const el of parsed) {
    if (typeof el !== 'object' || el === null) return null;
    const r = el as { startLine?: unknown; endLine?: unknown };
    const startLine = numericLine(r.startLine);
    const endLine = numericLine(r.endLine);
    if (startLine === null || endLine === null || endLine < startLine) return null;
    out.push({ startLine, endLine });
  }
  return out;
}

/** A short tail of captured stderr for an infra-fault message (never the full dump). */
function tail(stderr: string | null): string {
  if (stderr === null || stderr.length === 0) return '<empty>';
  const trimmed = stderr.trimEnd();
  return trimmed.length <= 500 ? trimmed : `…${trimmed.slice(trimmed.length - 500)}`;
}

/** The number of lines in a seam's source bytes (the relation line-bound). */
export function seamLineCount(target: MutationTargetFile): number {
  return target.text.split('\n').length;
}

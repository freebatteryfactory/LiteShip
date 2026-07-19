/**
 * The L4-SEAM TARGETING + the SOUND covering-tests map (Slice C, the avionics tier
 * — the host half of `liteship check --ir --mutate`).
 *
 * Two host-only computations the mutation run needs, both PURE + deterministic over
 * the repo bytes:
 *
 * 1. {@link l4SeamTargets} — the CRITICAL L4 seam set to aim the mutation cannon at,
 *    computed from the LIVE propagated assurance levels (the
 *    {@link propagateAssuranceLevels} fixpoint over the injected IR's import graph,
 *    floored by the committed glob map — THE LAW: the level is computed from the live
 *    IR, never a hardcoded list beside the file). The first deployment is scoped to a
 *    curated, tractable subset of the effective-L4 files — the "if this lies,
 *    downstream trusts bad reality" trust spine: the content-address / canonical
 *    kernel, the HLC clock, the plan / DAG / receipt / validated-output / assembly
 *    cores. Each candidate is intersected with the effective-L4 set, so a file that
 *    is NOT actually L4 (a map edit) silently drops rather than mutating a
 *    non-critical file.
 *
 * 2. {@link buildSeamCoverageMap} — the DETERMINISTIC, SOUND covering-tests map a
 *    mutant's verdict reads. THE COVERAGE MODEL (documented because soundness is
 *    load-bearing): a missed covering test is a FALSE SURVIVOR (the worst error — it
 *    cries wolf on tested code), so the map OVER-APPROXIMATES. The IR's import graph
 *    only spans each package's `src` tree (the audit source globs) — it does NOT
 *    contain the test corpus (`tests`), so a pure IR reverse-import closure cannot reach
 *    the test files. The sound closure is therefore a TEST-CORPUS SCAN: a test file
 *    COVERS a seam file F (in package P) iff it either
 *      (a) DEEP-IMPORTS F's source path (the precise signal — `packages/P/src/F.js`),
 *          OR
 *      (b) imports P's BARREL (`@liteship/P`) — a sound over-approximation, since a
 *          barrel importer pulls in F's package and could exercise any of its
 *          exports (the centralized-tests + barrel-import reality of this repo: most
 *          seam tests import `@liteship/core`, not a deep path).
 *    The union of (a) and (b) is the covering set for F; every mutant LINE of F maps
 *    to that same set (line-granularity coverage is not available without an
 *    instrumented run, so the file-granular set is used — again the SOUND direction:
 *    a mutant on any line of F runs every test that could exercise F).
 *
 * Both are pure functions of the IR + the on-disk test bytes — no clock, no rng, no
 * network. The same repo state yields the same targets + the same coverage map.
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeRepoPath } from '@liteship/audit';
import { makeCoverageMap, type CoverageMap, type MutationTargetFile } from '@liteship/audit';
import { levelOf, propagateAssuranceLevels, type RepoIR } from '@liteship/gauntlet';
import {
  computeSeamExecutionCoverage,
  executionCoverageRelation,
  seamLineCount,
  type CandidateTest,
  type SeamCandidates,
  type SeamExecutionCoverageOptions,
  type SeamTestExecution,
} from './seam-execution-coverage.js';

/**
 * The curated first-deployment L4 seam CANDIDATES — the trust-spine files whose
 * lie would make downstream trust bad reality. Each is intersected with the LIVE
 * effective-L4 set in {@link l4SeamTargets}, so the assurance map remains the source
 * of truth: a candidate that the propagated map does not actually rate L4 is dropped
 * (never mutated on a stale assumption). Repo-relative POSIX paths.
 *
 * THE CANONICAL/IDENTITY KERNEL (the deterministic content-addressing + FNV bytes)
 * is the most critical L4 seam ("if the content address lies, EVERY downstream
 * cache/receipt/capsule trusts a forged identity") AND the TRACTABLE one: the
 * canonical barrel is rarely imported, so its covering set is small (~9 tests/seam).
 *
 * THE BROAD CORE TRUST-SPINE SEAMS (hlc / dag, plus content-address / graph-patch
 * whose effective-L4 status is decided by the LIVE propagation, NEVER assumed here)
 * were previously deferred: their covering set is dominated by the SOUND barrel
 * over-approximation (every `@liteship/core` importer — ~220 tests), making a
 * suite-run-per-mutant intractable. The EXECUTION-BASED coverage filter
 * ({@link buildSeamCoverageMap} → `seam-execution-coverage.ts`) solves exactly this:
 * a barrel importer is kept for a seam's function-body lines ONLY when it actually
 * EXECUTES a function of the seam (proven by a scoped v8 coverage probe), pruning
 * ~220 barrel candidates to the handful that genuinely exercise the seam. The cannon
 * is now AIMED at the broad seams too, with no soundness compromise (a pruned test
 * provably never enters the seam, so it could never kill a mutant there; top-level
 * lines keep the full barrel closure — see the soundness note in
 * `seam-execution-coverage.ts`).
 *
 * Each candidate is intersected with the LIVE effective-L4 set in
 * {@link l4SeamTargets}: a candidate the propagation does NOT rate L4 (e.g. a file no
 * L4 file imports) is DROPPED and surfaced (`skippedNotL4`), never mutated on a stale
 * assumption. So adding a broad-seam candidate here is safe — the map is the source
 * of truth for what is actually targeted. The budget still caps the per-file
 * catalogue. Owner-redlinable.
 */
const L4_SEAM_CANDIDATES: readonly string[] = [
  // The canonical/identity kernel — content-addressing + deterministic FNV bytes.
  // The keystone of EVERY content address downstream trusts.
  'packages/canonical/src/addressed-digest.ts',
  'packages/canonical/src/fnv.ts',
  // The broad core trust-spine seams — now tractable via the execution-coverage
  // filter. content-address / graph-patch are listed as candidates but only mutated
  // if the LIVE propagation actually rates them L4 (content-address is pulled L4 by
  // validated-output; graph-patch's level is whatever the fixpoint computes — if it
  // is not L4 it is surfaced as skipped, never silently mutated).
  'packages/core/src/clock/hlc.ts',
  'packages/core/src/graph/dag.ts',
  'packages/core/src/evidence/content-address.ts',
  'packages/core/src/graph/graph-patch.ts',
  // The Wave-5.5 REACTIVE KERNELS (the transition cage's mutation retarget). Enrolling
  // the pinned kernel + the reactive primitives as mutation targets aims the existing
  // deterministic engine at the exact ordering/replay/emission logic the fc.commands
  // single-oracle model checks: a SURVIVING ordering/replay mutant here proves the model
  // (and its law-table tests) has a HOLE — no external mutator adopted, the same engine
  // retargeted. Each is intersected with the LIVE effective-L4 set in l4SeamTargets, so a
  // path the propagated map does NOT yet rate L4 (the reactive kernels resolve L4 only
  // once the assurance-map redline lands — remaining-waves.md §"assurance matrix") is
  // surfaced as skippedNotL4 and never mutated on a stale assumption. Landing the
  // candidates now is safe + forward-compatible: they ACTIVATE the moment the map (or the
  // live import propagation) rates them L4, with zero further targeting change.
  'packages/core/src/reactive/cell-kernel.ts',
  'packages/core/src/reactive/cell.ts',
  'packages/core/src/reactive/derived.ts',
  'packages/core/src/reactive/store.ts',
  'packages/core/src/reactive/signal.ts',
  'packages/core/src/motion/timeline.ts',
  'packages/core/src/reactive/live-cell.ts',
];

/**
 * The L4 seam target set for the live mutation run — the curated candidates that the
 * LIVE propagated assurance levels actually rate effective-L4, paired with their
 * current source bytes (the {@link MutationTargetFile} the engine mutates). Computed
 * from the IR's propagation fixpoint (THE LAW), so a file is targeted ONLY if it is
 * genuinely on the trust spine. Deterministic: sorted by file id.
 *
 * @param ir       the injected repo-IR whose import graph drives level propagation.
 * @param repoRoot the absolute repo root the source bytes are read from.
 * @throws never silently skips — a candidate whose bytes cannot be read is reported
 *         via the returned {@link SeamTargetResult.unreadable} list (the caller
 *         surfaces it), so a vanished seam is visible, never a quiet drop.
 */
export function l4SeamTargets(ir: RepoIR, repoRoot: string): SeamTargetResult {
  const effective = propagateAssuranceLevels(ir, (file) => levelOf(file));
  const targets: MutationTargetFile[] = [];
  const skippedNotL4: string[] = [];
  const unreadable: string[] = [];

  for (const candidate of [...L4_SEAM_CANDIDATES].sort((a, b) => a.localeCompare(b))) {
    // The level is the LIVE propagated level (IR fixpoint floored by the glob map),
    // never a hardcoded assumption — a candidate the map no longer rates L4 is
    // dropped, recorded so the caller can surface the drift.
    const level = effective.get(candidate) ?? levelOf(candidate);
    if (level !== 'L4') {
      skippedNotL4.push(candidate);
      continue;
    }
    let text: string;
    try {
      text = readFileSync(join(repoRoot, candidate), 'utf8');
    } catch {
      unreadable.push(candidate);
      continue;
    }
    targets.push({ file: candidate, text });
  }

  return { targets, skippedNotL4, unreadable };
}

/** The outcome of {@link l4SeamTargets} — the targets + the visible drops. */
export interface SeamTargetResult {
  /** The effective-L4 seam files paired with their current bytes (the mutate set). */
  readonly targets: readonly MutationTargetFile[];
  /** Candidates the live propagation does NOT rate L4 (dropped — surfaced, not hidden). */
  readonly skippedNotL4: readonly string[];
  /** Candidates whose bytes could not be read (a vanished seam — surfaced, not hidden). */
  readonly unreadable: readonly string[];
}

/** The repo-relative test roots scanned for covering tests (the vitest include set). */
const TEST_ROOTS: readonly string[] = [
  'tests/unit',
  'tests/integration',
  'tests/bench',
  'tests/smoke',
  'tests/property',
  'tests/component',
  'tests/regression',
  'tests/generated',
];

/** A discovered test file — its repo-relative POSIX id + its raw bytes (read once). */
interface TestFile {
  readonly id: string;
  readonly text: string;
}

/**
 * Recursively collect every `*.test.ts` file under `root` (repo-relative POSIX
 * ids), reading each one's bytes once. The established cli `readdirSync` recursion
 * (no new glob dependency). A missing root is skipped (a repo without that test
 * tier is valid); any other read fault propagates (never a silent swallow).
 */
function collectTestFiles(repoRoot: string, root: string): TestFile[] {
  const out: TestFile[] = [];
  const walk = (relDir: string): void => {
    let names: readonly string[];
    try {
      names = readdirSync(join(repoRoot, relDir));
    } catch (err) {
      // A missing test root is valid (skip); anything else is a real fault.
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
    for (const name of names) {
      const relPath = normalizeRepoPath(`${relDir}/${name}`);
      const stat = statSync(join(repoRoot, relPath));
      if (stat.isDirectory()) {
        walk(relPath);
      } else if (stat.isFile() && name.endsWith('.test.ts')) {
        out.push({ id: relPath, text: readFileSync(join(repoRoot, relPath), 'utf8') });
      }
    }
  };
  walk(root);
  return out;
}

/**
 * The barrel specifier for a seam file's package (`packages/<pkg>/src/...` →
 * `@liteship/<pkg>`), or `null` when the file is not under a `packages/<pkg>/src/`
 * layout (then only the deep-import signal applies). The repo's one internal scope
 * is `@liteship/` (the audit profile's `internalPackagePrefix`).
 */
function barrelOf(seamFile: string): string | null {
  const m = /^packages\/([^/]+)\/src\//.exec(normalizeRepoPath(seamFile));
  return m === null ? null : `@liteship/${m[1]}`;
}

/**
 * The deep-import path signal for a seam file — its `packages/P/src/F.js` form (the
 * compiled-specifier form a test uses: `.ts` source, `.js` import specifier). A test
 * file that CONTAINS this substring deep-imports the seam (the precise signal).
 */
function deepImportSpecifier(seamFile: string): string {
  return normalizeRepoPath(seamFile).replace(/\.ts$/, '.js');
}

/**
 * Does `test` DEEP-import `seamFile`'s source path? The precise covering signal — a
 * test that references `packages/P/src/F.js` exercises F by construction (it is
 * always kept, on every line, no probe).
 */
function testDeepImports(test: TestFile, seamFile: string): boolean {
  return test.text.includes(deepImportSpecifier(seamFile));
}

/**
 * Does `test` import the seam's package BARREL (`@liteship/P` or any `@liteship/P/sub`)? A
 * barrel importer pulls in F's package — the SOUND over-approximation candidate set.
 * It is no longer counted wholesale: the EXECUTION-COVERAGE filter probes each barrel
 * importer and keeps it for F's function-body lines only when it actually executes a
 * function of F (the barrel-problem fix). Matches both quote styles. Returns `false`
 * when the seam has no package barrel (then only the deep-import signal applies).
 */
function testImportsBarrel(test: TestFile, seamFile: string): boolean {
  const barrel = barrelOf(seamFile);
  if (barrel === null) return false;
  return (
    test.text.includes(`'${barrel}'`) ||
    test.text.includes(`"${barrel}"`) ||
    test.text.includes(`'${barrel}/`) ||
    test.text.includes(`"${barrel}/`)
  );
}

/**
 * Partition the test corpus into per-seam candidate sets — the DEEP-importers
 * (precise, always kept) and the BARREL-importers (probed by the execution filter).
 * Reads the test corpus ONCE (sorted, de-duplicated across the roots), so the
 * partition is a pure function of the seam ids + the on-disk test bytes.
 */
export function partitionSeamCandidates(
  repoRoot: string,
  seams: readonly MutationTargetFile[],
): readonly SeamCandidates[] {
  const seen = new Set<string>();
  const tests: TestFile[] = [];
  for (const root of TEST_ROOTS) {
    for (const t of collectTestFiles(repoRoot, root)) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      tests.push(t);
    }
  }
  tests.sort((a, b) => a.id.localeCompare(b.id));

  return seams.map((seam) => {
    const deepImporters: string[] = [];
    const barrelImporters: CandidateTest[] = [];
    for (const t of tests) {
      if (testDeepImports(t, seam.file)) {
        deepImporters.push(t.id);
      } else if (testImportsBarrel(t, seam.file)) {
        barrelImporters.push({ id: t.id, text: t.text });
      }
    }
    return {
      seamFile: seam.file,
      seamText: seam.text,
      deepImporters: deepImporters.sort((a, b) => a.localeCompare(b)),
      barrelImporters: barrelImporters.sort((a, b) => a.id.localeCompare(b.id)),
    };
  });
}

/** How the coverage map resolves a barrel-importer's covering scope for a seam. */
export type CoverageMode =
  | {
      /**
       * EXECUTION-based (the barrel-problem fix): each barrel importer is PROBED with
       * a scoped v8 coverage run and kept for a seam's function-body lines only when
       * it executes a function of the seam. The probe + cache are injected (the
       * production fs-cache, or a deterministic stub for the self-test).
       */
      readonly _tag: 'execution';
      readonly options: SeamExecutionCoverageOptions;
    }
  | {
      /**
       * BARREL over-approximation (the original sound-but-broad model): every barrel
       * importer covers every line. Retained for the canonical-kernel seams (whose
       * barrel set is already small ~9 tests, so the execution probe would only cost a
       * run to confirm), and as the no-probe path the determinism self-test compares.
       */
      readonly _tag: 'barrel';
    };

/**
 * Build the DETERMINISTIC, SOUND {@link CoverageMap} for the seam targets — every
 * mutable LINE of each seam file maps to the SORTED set of test-file ids that cover
 * it. The covering set is the DEEP-importers (precise) ∪ the barrel-importers scoped
 * by {@link CoverageMode}:
 *   - `execution` — each barrel importer is probed; a function-body line maps to the
 *     barrel importers that EXECUTE a function spanning it (the barrel-problem fix),
 *     a top-level line keeps the full sound barrel closure (see
 *     `seam-execution-coverage.ts`). This makes the broad core seams tractable.
 *   - `barrel` — every barrel importer covers every line (the original sound-but-broad
 *     closure), kept for the canonical-kernel seams whose barrel set is already small.
 *
 * The engine's {@link makeCoverageMap} de-duplicates + sorts, so the resulting
 * per-site covering list (and its digest, the verdict-cache key half) is byte-stable.
 *
 * @returns the coverage map AND the resolved per-seam covering-test lists (so the
 *          caller can report which tests cover each seam — the work-list provenance).
 */
export function buildSeamCoverageMap(
  repoRoot: string,
  seams: readonly MutationTargetFile[],
  mode: CoverageMode = { _tag: 'barrel' },
): SeamCoverageResult {
  const candidates = partitionSeamCandidates(repoRoot, seams);
  const lineCount = new Map<string, number>(seams.map((s) => [s.file, seamLineCount(s)]));

  // Resolve the per-(test, seam) execution decisions. In `barrel` mode every barrel
  // candidate covers every line (the empty function-range list with the relation's
  // top-level fallback yields the full barrel closure — sound, broad). In `execution`
  // mode the probe prunes them to the executing subset.
  const executions: SeamTestExecution[] = [];
  for (const candidate of candidates) {
    for (const testId of candidate.deepImporters) {
      executions.push({ testId, seamFile: candidate.seamFile, deepImporter: true, coveredFunctionRanges: [] });
    }
  }
  if (mode._tag === 'execution') {
    for (const ex of computeSeamExecutionCoverage(candidates, mode.options)) {
      if (!ex.deepImporter) executions.push(ex);
    }
  } else {
    for (const candidate of candidates) {
      for (const test of candidate.barrelImporters) {
        // Empty ranges → the relation's top-level fallback maps the barrel importer to
        // EVERY line: exactly the original sound-but-broad barrel closure.
        executions.push({
          testId: test.id,
          seamFile: candidate.seamFile,
          deepImporter: false,
          coveredFunctionRanges: [],
        });
      }
    }
  }

  const relation = executionCoverageRelation(executions, lineCount);

  // Per-seam provenance: the sorted, de-duplicated covering test ids across all lines.
  const coveringBySeam = new Map<string, readonly string[]>();
  for (const seam of seams) {
    const set = new Set<string>();
    for (const r of relation) if (r.file === seam.file) set.add(r.testId);
    coveringBySeam.set(
      seam.file,
      [...set].sort((a, b) => a.localeCompare(b)),
    );
  }

  return { coverage: makeCoverageMap(relation), coveringBySeam };
}

/** The outcome of {@link buildSeamCoverageMap} — the map + the per-seam provenance. */
export interface SeamCoverageResult {
  /** The deterministic covering-tests map the verdict reads. */
  readonly coverage: CoverageMap;
  /** Per-seam-file → its sorted covering test ids (the work-list provenance). */
  readonly coveringBySeam: ReadonlyMap<string, readonly string[]>;
}

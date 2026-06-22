/**
 * The L4-SEAM TARGETING + the SOUND covering-tests map (Slice C, the avionics tier
 * — the host half of `czap check --ir --mutate`).
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
 *      (b) imports P's BARREL (`@czap/P`) — a sound over-approximation, since a
 *          barrel importer pulls in F's package and could exercise any of its
 *          exports (the centralized-tests + barrel-import reality of this repo: most
 *          seam tests import `@czap/core`, not a deep path).
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
import { normalizeRepoPath } from '@czap/audit';
import { makeCoverageMap, type CoverageMap, type MutationTargetFile } from '@czap/audit';
import { levelOf, propagateAssuranceLevels, type RepoIR } from '@czap/gauntlet';

/**
 * The curated first-deployment L4 seam CANDIDATES — the trust-spine files whose
 * lie would make downstream trust bad reality. Each is intersected with the LIVE
 * effective-L4 set in {@link l4SeamTargets}, so the assurance map remains the source
 * of truth: a candidate that the propagated map does not actually rate L4 is dropped
 * (never mutated on a stale assumption). Repo-relative POSIX paths.
 *
 * THE FIRST DEPLOYMENT IS SCOPED TO THE CANONICAL/IDENTITY KERNEL (the deterministic
 * content-addressing + FNV bytes). It is the most critical L4 seam ("if the content
 * address lies, EVERY downstream cache/receipt/capsule trusts a forged identity") AND
 * it is the TRACTABLE one: the canonical barrel is rarely imported, so its covering
 * set is small (~9 tests/seam), keeping the suite-runs-per-mutant bounded for a first
 * honest run. The CORE trust-spine seams (content-address.ts, hlc.ts, plan/dag/
 * receipt/validated-output/assembly) are equally effective-L4 but their covering set
 * is dominated by the SOUND barrel over-approximation (every `@czap/core` importer —
 * ~220 tests), so a tractable run over them needs LINE-GRANULAR coverage
 * instrumentation (an instrumented coverage report mapping each mutant LINE to only
 * the tests that hit it) — the queued next increment. Keeping them out of the first
 * cannon is the aim-don't-spray discipline, NOT a soundness compromise: the coverage
 * map for the targeted seams is the full sound closure.
 *
 * The cannon is aimed, not sprayed (a suite-run-per-mutant is heavy; the budget caps
 * per file). Owner-redlinable: add the core seams here once the line-granular
 * coverage map lands.
 */
const L4_SEAM_CANDIDATES: readonly string[] = [
  // The canonical/identity kernel — content-addressing + deterministic FNV bytes.
  // The keystone of EVERY content address downstream trusts.
  'packages/canonical/src/addressed-digest.ts',
  'packages/canonical/src/fnv.ts',
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
 * `@czap/<pkg>`), or `null` when the file is not under a `packages/<pkg>/src/`
 * layout (then only the deep-import signal applies). The repo's one internal scope
 * is `@czap/` (the audit profile's `internalPackagePrefix`).
 */
function barrelOf(seamFile: string): string | null {
  const m = /^packages\/([^/]+)\/src\//.exec(normalizeRepoPath(seamFile));
  return m === null ? null : `@czap/${m[1]}`;
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
 * Does `test` cover `seamFile`? SOUND over-approximation (the documented model): a
 * deep import of the seam's source path (precise) OR a barrel import of the seam's
 * package (a barrel importer could exercise any export of the package, so it MUST be
 * counted — under-counting yields false survivors). The barrel test matches both
 * `from '@czap/pkg'` and `from '@czap/pkg/sub'` by checking the quoted-prefix forms.
 */
function testCoversSeam(test: TestFile, seamFile: string): boolean {
  if (test.text.includes(deepImportSpecifier(seamFile))) return true;
  const barrel = barrelOf(seamFile);
  if (barrel === null) return false;
  // Match an import/export specifier of the barrel or any of its subpaths, in either
  // quote style — `'@czap/core'`, `"@czap/core"`, `'@czap/core/host'`, etc.
  return (
    test.text.includes(`'${barrel}'`) ||
    test.text.includes(`"${barrel}"`) ||
    test.text.includes(`'${barrel}/`) ||
    test.text.includes(`"${barrel}/`)
  );
}

/**
 * Build the DETERMINISTIC, SOUND {@link CoverageMap} for the seam targets — every
 * mutable LINE of each seam file maps to the SORTED set of test-file ids that cover
 * it (deep-import precise ∪ barrel-import over-approximation; see the module doc).
 *
 * Line granularity: the coverage relation is built over `(file, line)` for EVERY
 * line `1..lineCount(F)` of each seam file, all mapped to F's covering set. The
 * engine's {@link makeCoverageMap} de-duplicates + sorts, so the resulting per-site
 * covering list (and its digest, the verdict-cache key half) is byte-stable. Because
 * the relation covers every line, a mutant at ANY line of F resolves to F's covering
 * tests — never a NO-COVERAGE false negative for a covered file.
 *
 * Pure + deterministic: a function of the seam bytes + the test-corpus bytes only.
 *
 * @returns the coverage map AND the resolved per-seam covering-test lists (so the
 *          caller can report which tests cover each seam — the work-list provenance).
 */
export function buildSeamCoverageMap(
  repoRoot: string,
  seams: readonly MutationTargetFile[],
): SeamCoverageResult {
  // Read the test corpus ONCE (sorted, de-duplicated test ids across the roots).
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

  const relation: { file: string; line: number; testId: string }[] = [];
  const coveringBySeam = new Map<string, readonly string[]>();
  for (const seam of seams) {
    const covering = tests.filter((t) => testCoversSeam(t, seam.file)).map((t) => t.id);
    const sorted = [...covering].sort((a, b) => a.localeCompare(b));
    coveringBySeam.set(seam.file, sorted);
    // Map EVERY line of the seam to its covering set (file-granular soundness — a
    // mutant on any line runs every test that could exercise the file).
    const lineCount = seam.text.split('\n').length;
    for (let line = 1; line <= lineCount; line++) {
      for (const testId of sorted) relation.push({ file: seam.file, line, testId });
    }
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

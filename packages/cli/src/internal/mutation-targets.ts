/**
 * The L4-SEAM TARGETING + the SOUND covering-tests map (Slice C, the avionics tier
 * — the host half of `liteship check gates --ir --mutate`).
 *
 * Two host-only computations the mutation run needs, both PURE + deterministic over
 * the repo bytes:
 *
 * 1. {@link assuranceTargets} — the COMPLETE mutation-analyzable source census: live
 *    effective-L4 files plus catalog-enrolled public runtime closures, computed from
 *    propagated assurance levels and resolved RepoIR reachability (the
 *    {@link propagateAssuranceLevels} fixpoint over the injected IR's import graph,
 *    floored by the committed glob map — THE LAW: the level is computed from the live
 *    IR, never a hardcoded list beside the file). There is no second curated candidate
 *    list: campaigns are projected from the one package catalog and package export
 *    maps. Omitting an L4 or campaign-reachable source is a target-census error, not a quiet
 *    optimization. Execution coverage and content-addressed verdict caching bound
 *    cost without narrowing the semantic target set.
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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeRepoPath } from '@liteship/audit';
import { makeCoverageMap, type CoverageMap, type MutationTargetFile } from '@liteship/audit';
import {
  levelOf,
  propagateAssuranceLevels,
  type AssuranceTargetReason,
  type RepoIR,
  type SemanticAssuranceRequirement,
} from '@liteship/gauntlet';
import { GENERATED_SEMANTIC_ASSURANCE_CAMPAIGNS } from './semantic-assurance-campaigns.generated.js';
import {
  computeSeamExecutionCoverage,
  executionCoverageRelation,
  seamLineCount,
  type CandidateTest,
  type SeamCandidates,
  type SeamExecutionCoverageOptions,
  type SeamTestExecution,
} from './seam-execution-coverage.js';
import { collectRepoTestFiles, type RepoTestFile } from './test-corpus.js';

/** Is an IR file a package TypeScript source the mutation analyzers own? */
function isPackageMutationSource(file: string): boolean {
  return /^packages\/[^/]+\/src\/.+\.ts$/.test(file) && !file.endsWith('.d.ts');
}

/**
 * The complete live L4 source census. Assurance propagation is the sole owner of
 * eligibility; a hand-maintained seam list cannot silently lag a move or rename.
 */
export function eligibleL4SeamFiles(ir: RepoIR): readonly string[] {
  const effective = propagateAssuranceLevels(ir, (file) => levelOf(file));
  return [...ir.files.keys()]
    .filter(isPackageMutationSource)
    .filter((file) => (effective.get(file) ?? levelOf(file)) === 'L4')
    .sort((a, b) => a.localeCompare(b));
}

/** One catalog-authored semantic assurance campaign projected from package exports. */
export interface SemanticAssuranceCampaign {
  readonly id: string;
  readonly owner: string;
  readonly packageDir: string;
  readonly scope: 'public-runtime-closure';
  readonly required: readonly SemanticAssuranceRequirement[];
  readonly class: 'semantic-l4';
  readonly entrypoints: readonly string[];
}

/** One expected target plus every independent reason that admitted it. */
export interface ExpectedAssuranceTarget {
  readonly file: string;
  readonly reasons: readonly AssuranceTargetReason[];
}

/** The pure target selection before source bytes are read. */
export interface AssuranceTargetSelection {
  readonly expectedTargets: readonly ExpectedAssuranceTarget[];
  readonly unresolvedEntrypoints: readonly string[];
}

function reasonKey(reason: AssuranceTargetReason): string {
  return reason.kind === 'effective-level'
    ? `effective-level:${reason.level}`
    : `semantic-campaign:${reason.campaignId}:${reason.owner}:${reason.required.join(',')}`;
}

function sortedReasons(reasons: Iterable<AssuranceTargetReason>): readonly AssuranceTargetReason[] {
  return [...reasons].sort((left, right) => reasonKey(left).localeCompare(reasonKey(right)));
}

/**
 * Select the effective-L4 trust spine plus each enrolled package's live public runtime
 * closure. Campaign reachability follows the same resolved RepoIR edges used by the
 * assurance engine and may not escape the owning package's `src` tree.
 */
export function eligibleAssuranceTargets(
  ir: RepoIR,
  campaigns: readonly SemanticAssuranceCampaign[] = GENERATED_SEMANTIC_ASSURANCE_CAMPAIGNS,
): AssuranceTargetSelection {
  const byFile = new Map<string, Map<string, AssuranceTargetReason>>();
  const admit = (file: string, reason: AssuranceTargetReason): void => {
    const reasons = byFile.get(file) ?? new Map<string, AssuranceTargetReason>();
    reasons.set(reasonKey(reason), reason);
    byFile.set(file, reasons);
  };

  for (const file of eligibleL4SeamFiles(ir)) admit(file, { kind: 'effective-level', level: 'L4' });

  const edgesBySource = new Map<string, string[]>();
  for (const edge of ir.imports) {
    if (edge.targetFile === undefined) continue;
    const targets = edgesBySource.get(edge.fromFile) ?? [];
    targets.push(edge.targetFile);
    edgesBySource.set(edge.fromFile, targets);
  }
  for (const targets of edgesBySource.values()) targets.sort((left, right) => left.localeCompare(right));

  const unresolvedEntrypoints: string[] = [];
  for (const campaign of [...campaigns].sort((left, right) => left.id.localeCompare(right.id))) {
    const sourcePrefix = `${normalizeRepoPath(campaign.packageDir)}/src/`;
    const reason: AssuranceTargetReason = {
      kind: 'semantic-campaign',
      campaignId: campaign.id,
      owner: campaign.owner,
      class: campaign.class,
      required: [...campaign.required].sort((left, right) => left.localeCompare(right)),
    };
    const pending = [...campaign.entrypoints].map(normalizeRepoPath).sort((left, right) => right.localeCompare(left));
    const visited = new Set<string>();
    while (pending.length > 0) {
      const file = pending.pop()!;
      if (visited.has(file)) continue;
      visited.add(file);
      if (!ir.files.has(file)) {
        if (campaign.entrypoints.map(normalizeRepoPath).includes(file)) {
          unresolvedEntrypoints.push(`${campaign.id}:${file}`);
        }
        continue;
      }
      if (!file.startsWith(sourcePrefix) || !isPackageMutationSource(file)) continue;
      admit(file, reason);
      for (const target of edgesBySource.get(file) ?? []) {
        if (target.startsWith(sourcePrefix) && !visited.has(target)) pending.push(target);
      }
      pending.sort((left, right) => right.localeCompare(left));
    }
  }

  const expectedTargets = [...byFile.entries()]
    .map(([file, reasons]) => ({ file, reasons: sortedReasons(reasons.values()) }))
    .sort((left, right) => left.file.localeCompare(right.file));
  return {
    expectedTargets,
    unresolvedEntrypoints: [...new Set(unresolvedEntrypoints)].sort((left, right) => left.localeCompare(right)),
  };
}

function materializeTargets(
  selection: AssuranceTargetSelection,
  repoRoot: string,
  censusLabel: SeamTargetResult['censusLabel'],
): SeamTargetResult {
  const targets: MutationTargetFile[] = [];
  const unreadable: string[] = [];
  for (const candidate of selection.expectedTargets) {
    try {
      targets.push({
        file: candidate.file,
        text: readFileSync(join(repoRoot, candidate.file), 'utf8'),
        reasons: candidate.reasons,
      });
    } catch {
      unreadable.push(candidate.file);
    }
  }
  return {
    expectedFiles: selection.expectedTargets.map((target) => target.file),
    expectedTargets: selection.expectedTargets,
    targets,
    unreadable,
    unresolvedEntrypoints: selection.unresolvedEntrypoints,
    censusLabel,
  };
}

/** Materialize the union of effective-L4 and catalog-enrolled semantic campaign targets. */
export function assuranceTargets(
  ir: RepoIR,
  repoRoot: string,
  campaigns: readonly SemanticAssuranceCampaign[] = GENERATED_SEMANTIC_ASSURANCE_CAMPAIGNS,
): SeamTargetResult {
  return materializeTargets(eligibleAssuranceTargets(ir, campaigns), repoRoot, 'assurance');
}

/**
 * The L4 seam target set for the live mutation run — every package source the
 * LIVE propagated assurance levels rate effective-L4, paired with its
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
  return materializeTargets(
    {
      expectedTargets: eligibleL4SeamFiles(ir).map((file) => ({
        file,
        reasons: [{ kind: 'effective-level', level: 'L4' }],
      })),
      unresolvedEntrypoints: [],
    },
    repoRoot,
    'eligible L4',
  );
}

/** The outcome of {@link l4SeamTargets} — the targets + the visible drops. */
export interface SeamTargetResult {
  /** Every mutation-analyzable source file the live propagated assurance map rates L4. */
  readonly expectedFiles: readonly string[];
  /** The same census with independently derived admission provenance. */
  readonly expectedTargets?: readonly ExpectedAssuranceTarget[];
  /** The effective-L4 seam files paired with their current bytes (the mutate set). */
  readonly targets: readonly MutationTargetFile[];
  /** Candidates whose bytes could not be read (a vanished seam — surfaced, not hidden). */
  readonly unreadable: readonly string[];
  /** Campaign entrypoints absent from the live IR (a catalog/IR mismatch). */
  readonly unresolvedEntrypoints?: readonly string[];
  /** Diagnostic noun used by the compatibility L4 wrapper and the campaign selector. */
  readonly censusLabel?: 'eligible L4' | 'assurance';
}

/**
 * Compare a materialized target list with the live L4 census. Any omission,
 * duplicate, foreign target, or unreadable eligible file blocks admission.
 */
export function targetCensusErrors(result: SeamTargetResult): readonly string[] {
  const errors: string[] = [];
  const label = result.censusLabel ?? 'eligible L4';
  const actual = result.targets.map((target) => target.file);
  const actualSet = new Set(actual);
  for (const file of result.expectedFiles) {
    if (!actualSet.has(file)) errors.push(`${label} target omitted: ${file}`);
  }
  const expectedSet = new Set(result.expectedFiles);
  for (const file of actualSet) {
    if (!expectedSet.has(file))
      errors.push(
        label === 'eligible L4' ? `foreign non-L4 target admitted: ${file}` : `foreign target admitted: ${file}`,
      );
  }
  const seen = new Set<string>();
  for (const file of actual) {
    if (seen.has(file)) errors.push(`duplicate mutation target: ${file}`);
    seen.add(file);
  }
  for (const file of result.unreadable) errors.push(`${label} target unreadable: ${file}`);
  for (const entrypoint of result.unresolvedEntrypoints ?? []) {
    errors.push(`semantic campaign entrypoint unresolved: ${entrypoint}`);
  }
  return errors.sort((a, b) => a.localeCompare(b));
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
function testDeepImports(test: RepoTestFile, seamFile: string): boolean {
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
function testImportsBarrel(test: RepoTestFile, seamFile: string): boolean {
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
  const tests = collectRepoTestFiles(repoRoot);

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

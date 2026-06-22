/**
 * The HOST builders for the LOCAL-VS-GLOBAL correctness family (the lax-functor
 * proof-propagation + the composition-coverage analysis). The heavy IR/graph/signal
 * work lives HERE (the CLI host owns `fs` + the IR + the test corpus, ADR-0012); the
 * lean `@czap/gauntlet` gates only FOLD the flat facts these builders produce.
 *
 * Both builders are PURE + DETERMINISTIC over the repo bytes + the injected IR — no
 * clock, no rng, no network. The same repo state yields byte-identical facts (the
 * invariant the gates' determinism rests on).
 *
 *  1. {@link buildProofFacts} — reads the proof SIGNALS (the committed
 *     `benchmarks/mutation-score.json` ratchet, the `coverage/coverage-final.json`
 *     report, the per-file PROPERTY-test presence, the enrolled-invariant ledger
 *     `traceability/invariants.yaml`), blends them per module into the normalized
 *     `localProof` scalar via {@link blendProof}, and emits one {@link ModuleProof}
 *     per IR file. The gate propagates the scalar along the dep DAG.
 *
 *  2. {@link buildCompositionFacts} — derives the interaction edges from the IR's
 *     import graph (a file→file dependency where BOTH endpoints are individually
 *     tested), then classifies each edge integration-covered iff a single test file
 *     statically references BOTH endpoints (the SOUND `static-reference`
 *     over-approximation — the honest limit the gate carries: it is not an execution
 *     probe, so a covered edge means only "a test names both", never proof the call
 *     is driven). An uncovered edge is the finding.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InvariantViolationError } from '@czap/error';
import { normalizeRepoPath } from '@czap/audit';
import type {
  CompositionFacts,
  InteractionEdge,
  ModuleProof,
  ProofFacts,
  ProofSignals,
  RepoIR,
  FileId,
} from '@czap/gauntlet';
import { collectRepoTestFiles, type RepoTestFile } from './test-corpus.js';

/** The committed per-file mutation-score baseline (the ratchet artifact). */
const MUTATION_SCORE_BASELINE = 'benchmarks/mutation-score.json';
/** The v8/istanbul coverage report the merged run produces. */
const COVERAGE_FINAL = 'coverage/coverage-final.json';
/** The enrolled-invariants ledger (the avionics requirements register). */
const INVARIANTS_LEDGER = 'traceability/invariants.yaml';

/**
 * The proof-signal BLEND WEIGHTS — redlinable DATA (the host owns the blend; the
 * gate owns the propagation). The two MEASURED fractions (mutation, coverage) carry
 * the bulk; the two BOOLEAN signals (a property test, an enrolled invariant) are
 * smaller confidence bonuses. They sum to 1, so the blended scalar is in `[0, 1]`.
 * An UNMEASURED fraction contributes 0 for its weight (the sound direction: a
 * missing measurement lowers proof, never inflates it).
 */
export const PROOF_BLEND_WEIGHTS: Readonly<{
  mutation: number;
  coverage: number;
  property: number;
  invariant: number;
}> = { mutation: 0.45, coverage: 0.35, property: 0.1, invariant: 0.1 } as const;

/**
 * Blend the four proof signals into a normalized `localProof` scalar in `[0, 1]`.
 * A measured fraction contributes `weight * fraction`; an UNMEASURED fraction (null)
 * contributes 0 (sound: a missing measurement cannot raise proof). The two booleans
 * contribute their full weight when present. Deterministic + pure.
 */
export function blendProof(signals: ProofSignals): number {
  const mut = (signals.mutationScore ?? 0) * PROOF_BLEND_WEIGHTS.mutation;
  const cov = (signals.coverage ?? 0) * PROOF_BLEND_WEIGHTS.coverage;
  const prop = signals.hasPropertyTest ? PROOF_BLEND_WEIGHTS.property : 0;
  const inv = signals.hasEnrolledInvariant ? PROOF_BLEND_WEIGHTS.invariant : 0;
  const blended = mut + cov + prop + inv;
  // Clamp defensively to [0, 1] — the weights sum to 1 and each fraction is in [0, 1],
  // so this never actually clamps, but the gate rejects an out-of-range scalar loudly.
  return blended < 0 ? 0 : blended > 1 ? 1 : blended;
}

/** Read + parse the committed mutation-score baseline (absent → empty). */
function readMutationScores(repoRoot: string): Readonly<Record<string, number>> {
  const path = join(repoRoot, MUTATION_SCORE_BASELINE);
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw InvariantViolationError(
      'local-vs-global',
      `the mutation-score baseline "${MUTATION_SCORE_BASELINE}" is not a JSON object of file→score`,
    );
  }
  const scores: Record<string, number> = {};
  for (const [file, score] of Object.entries(parsed)) {
    if (typeof score === 'number' && Number.isFinite(score)) scores[normalizeRepoPath(file)] = score;
  }
  return scores;
}

/**
 * Read the v8/istanbul coverage report and compute the per-file STATEMENT-coverage
 * fraction (covered statements / total statements), keyed by repo-relative POSIX
 * path. Absent report → empty map (every module is coverage-unmeasured — the sound
 * direction). A file with zero statements maps to 1 (vacuously covered). The report
 * keys are ABSOLUTE paths; they are made repo-relative against `repoRoot`.
 */
function readCoverageFractions(repoRoot: string): ReadonlyMap<FileId, number> {
  const path = join(repoRoot, COVERAGE_FINAL);
  const out = new Map<FileId, number>();
  if (!existsSync(path)) return out;
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) return out;
  const prefix = normalizeRepoPath(repoRoot).replace(/\/$/, '') + '/';
  for (const [absPath, entry] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const s = (entry as { s?: unknown }).s;
    if (typeof s !== 'object' || s === null) continue;
    const counts = Object.values(s as Record<string, unknown>).filter((v): v is number => typeof v === 'number');
    const total = counts.length;
    const covered = counts.filter((v) => v > 0).length;
    const fraction = total === 0 ? 1 : covered / total;
    const rel = normalizeRepoPath(absPath);
    const relativeId = rel.startsWith(prefix) ? rel.slice(prefix.length) : rel;
    out.set(relativeId, fraction);
  }
  return out;
}

/**
 * The set of IR files that at least one ENROLLED system invariant traces to. The
 * ledger entries do not carry a file path directly; the trace is via the `// PROVES:
 * <id>` headers in the test corpus + the test's covering target. As a SOUND, lean
 * proxy (the gate never claims more than measured), a module is treated as
 * invariant-backed iff a test carrying ANY enrolled invariant id's `PROVES` header
 * deep-imports it. This reuses the same deep-import signal the mutation coverage map
 * uses. Absent ledger → empty set.
 */
function readInvariantBackedFiles(repoRoot: string, ir: RepoIR, tests: readonly RepoTestFile[]): ReadonlySet<FileId> {
  const ledgerPath = join(repoRoot, INVARIANTS_LEDGER);
  const backed = new Set<FileId>();
  if (!existsSync(ledgerPath)) return backed;
  const ledger = readFileSync(ledgerPath, 'utf8');
  // The enrolled invariant ids — the `id: INV-*` entries (a lean line scan, no YAML
  // dependency; the ledger ids are stable INV-* tokens). A test PROVES one iff it
  // carries a `// PROVES: <id>` header naming it.
  const enrolledIds = new Set<string>();
  for (const line of ledger.split(/\r?\n/)) {
    const m = /^\s*-?\s*id:\s*(INV-[A-Z0-9-]+)/.exec(line);
    if (m !== null && m[1] !== undefined) enrolledIds.add(m[1]);
  }
  if (enrolledIds.size === 0) return backed;
  const deepSpecifierOf = (file: FileId): string => normalizeRepoPath(file).replace(/\.ts$/, '.js');
  for (const test of tests) {
    // Does this test carry a PROVES header for an enrolled invariant?
    const proves = [...test.text.matchAll(/PROVES:\s*(INV-[A-Z0-9-]+)/g)].some((mm) => mm[1] !== undefined && enrolledIds.has(mm[1]));
    if (!proves) continue;
    // It proves an enrolled invariant — every IR file it deep-imports is invariant-backed.
    for (const file of ir.files.keys()) {
      if (test.text.includes(deepSpecifierOf(file))) backed.add(file);
    }
  }
  return backed;
}

/**
 * Does a test file PROPERTY-test `file`? The lean, sound proxy: a test that BOTH
 * deep-imports the file AND uses `fast-check` (the `fc.` / `import ... fast-check`
 * markers) property-tests it. This is the same deep-import signal, gated on the
 * presence of the property-testing library — an over-approximation in the safe
 * direction (it never invents a property test where none exists).
 */
function readPropertyTestedFiles(ir: RepoIR, tests: readonly RepoTestFile[]): ReadonlySet<FileId> {
  const out = new Set<FileId>();
  const deepSpecifierOf = (file: FileId): string => normalizeRepoPath(file).replace(/\.ts$/, '.js');
  for (const test of tests) {
    const usesFastCheck = test.text.includes('fast-check') || /\bfc\./.test(test.text);
    if (!usesFastCheck) continue;
    for (const file of ir.files.keys()) {
      if (test.text.includes(deepSpecifierOf(file))) out.add(file);
    }
  }
  return out;
}

/**
 * Build the {@link ProofFacts} the `proofPropagationGate` folds — one
 * {@link ModuleProof} per IR file, its `localProof` the {@link blendProof} of the
 * four signals read from the committed artifacts + the test corpus. Pure +
 * deterministic over the repo bytes + the IR. The gate propagates the scalar along
 * the dep DAG (the `min`-fixpoint) and reports the trust-spine modules whose global
 * proof drops below their floor through a weak dependency.
 */
export function buildProofFacts(repoRoot: string, ir: RepoIR): ProofFacts {
  const tests = collectRepoTestFiles(repoRoot);
  const mutationScores = readMutationScores(repoRoot);
  const coverage = readCoverageFractions(repoRoot);
  const invariantBacked = readInvariantBackedFiles(repoRoot, ir, tests);
  const propertyTested = readPropertyTestedFiles(ir, tests);

  const modules: ModuleProof[] = [];
  for (const file of ir.files.keys()) {
    const signals: ProofSignals = {
      mutationScore: mutationScores[file] ?? null,
      coverage: coverage.get(file) ?? null,
      hasPropertyTest: propertyTested.has(file),
      hasEnrolledInvariant: invariantBacked.has(file),
    };
    modules.push({ file, localProof: blendProof(signals), signals });
  }
  // Deterministic order — same repo state → byte-identical facts.
  modules.sort((a, b) => a.file.localeCompare(b.file));
  return { modules };
}

/**
 * The repo-relative source IDs that are individually tested — a file is individually
 * tested iff at least one test DEEP-imports it (the precise signal). This is the
 * filter the composition edges require on BOTH endpoints (an edge whose endpoint is
 * untested is a weaker, different finding the proof family owns, not this one).
 */
function individuallyTestedFiles(ir: RepoIR, tests: readonly RepoTestFile[]): ReadonlySet<FileId> {
  const out = new Set<FileId>();
  const deepSpecifierOf = (file: FileId): string => normalizeRepoPath(file).replace(/\.ts$/, '.js');
  for (const file of ir.files.keys()) {
    const spec = deepSpecifierOf(file);
    if (tests.some((t) => t.text.includes(spec))) out.add(file);
  }
  return out;
}

/**
 * Is the interaction edge `from → to` integration-COVERED? The SOUND
 * `static-reference` over-approximation (the honest limit the gate carries): an edge
 * is covered iff a single test file statically REFERENCES BOTH endpoints (deep-imports
 * both source paths). This is NOT an execution probe — a test that names both may not
 * drive the call — so a covered verdict means only "a test touches both", never proof
 * the composition is exercised. Returns the covering test id when found (for the
 * evidence), or null. Over-approximating is the safe direction: it only ever
 * SUPPRESSES a finding when at least one test touches both endpoints.
 */
function staticIntegrationCover(from: FileId, to: FileId, tests: readonly RepoTestFile[]): string | null {
  const fromSpec = normalizeRepoPath(from).replace(/\.ts$/, '.js');
  const toSpec = normalizeRepoPath(to).replace(/\.ts$/, '.js');
  for (const test of tests) {
    if (test.text.includes(fromSpec) && test.text.includes(toSpec)) return test.id;
  }
  return null;
}

/**
 * Build the {@link CompositionFacts} the `compositionCoverageGate` folds — the
 * interaction edges between individually-tested units, each classified
 * integration-covered/uncovered. An edge is `from → to` where `from` imports `to`
 * (the IR's resolved internal import edge — the file-granular interaction signal),
 * BOTH endpoints are individually tested, and the edge is covered iff a single test
 * references both (the sound static proxy). Pure + deterministic; the edges are
 * de-duplicated per (from, to) and sorted. A self-edge (from === to) is skipped (a
 * module's interaction with itself is its own unit test's job).
 */
export function buildCompositionFacts(repoRoot: string, ir: RepoIR): CompositionFacts {
  const tests = collectRepoTestFiles(repoRoot);
  const tested = individuallyTestedFiles(ir, tests);

  // De-duplicate the IR's import edges to one interaction per (from, to), keeping the
  // first specifier's referenced symbol (the IR edge carries the specifier; the via
  // symbol is the last path segment of the target, a concrete-enough label).
  const seen = new Set<string>();
  const edges: InteractionEdge[] = [];
  for (const edge of ir.imports) {
    if (edge.targetFile === undefined) continue;
    const from = edge.fromFile;
    const to = edge.targetFile;
    if (from === to) continue; // a self-import is not a composition edge.
    // BOTH endpoints must be individually tested — otherwise it is a proof-family
    // finding (an untested unit), not a composition gap.
    if (!tested.has(from) || !tested.has(to)) continue;
    const key = `${from}${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const coveringTest = staticIntegrationCover(from, to, tests);
    const viaSymbol = normalizeRepoPath(to).replace(/^.*\//, '').replace(/\.ts$/, '');
    edges.push({
      fromFile: from,
      toFile: to,
      viaSymbol,
      integrationCovered: coveringTest !== null,
      evidence: coveringTest !== null ? { _tag: 'static-reference', testId: coveringTest } : { _tag: 'none' },
    });
  }
  edges.sort((a, b) => a.fromFile.localeCompare(b.fromFile) || a.toFile.localeCompare(b.toFile));
  return { edges };
}

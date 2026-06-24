/**
 * The AMBITION÷PROOF HEATMAP — the claim-vs-reality family's ADVISORY half.
 *
 * The hard {@link claimPropertyGate} / {@link perfClaimBenchGate} catch a DECIDABLE
 * lie: a claim with no measurable confirmer. But the deeper question — "which modules
 * PROMISE the most and PROVE the least?" — is undecidable to answer with a verdict
 * (Rice). So this is NOT a gate: it is a PURE, DETERMINISTIC TRIAGE that ranks every
 * substantive module by how far its AMBITION outruns its PROOF, surfacing the
 * high-ambition / low-proof HOT SPOTS a human investigates. It has NO authority, emits
 * NO {@link Finding}, and NEVER blocks. Selling such a triage as proof is the fairy
 * dust the whole family hunts; this module refuses to commit it — it is advisory by
 * construction (it cannot even be wired as a gate: it returns data, not findings).
 *
 * THE FORMULA (a normalized blend ÷ a normalized blend, both in `[0, 1]`).
 *
 *  AMBITION — how much a module promises / how much there is to get wrong:
 *   • SIZE          — its source byte-length, normalized against the corpus max.
 *   • COMPLEXITY    — its symbol count (a cheap cyclomatic/cognitive proxy from the
 *                     IR), normalized against the corpus max.
 *   • CLAIM DENSITY — its claim-keyword hits per KB (the perf + semantic vocab the
 *                     hard gates scan), normalized against the corpus max.
 *   • ASSURANCE     — its EFFECTIVE assurance level rank L0..L4, normalized /4 (an L4
 *                     trust-spine module is maximally ambitious — the most to uphold).
 *   AMBITION = the mean of the four sub-scores (each pre-normalized to `[0, 1]`).
 *
 *  PROOF — how much confirms the module actually does what it promises:
 *   • HAS-TEST      — a governed test file references it (0 or 1).
 *   • PROPERTY-TEST — a fast-check property test references it (0 or 1).
 *   • MUTATION      — its committed mutation score in `[0, 1]` (benchmarks/
 *                     mutation-score.json), or 0 when unmeasured (the SOUND floor — an
 *                     unmeasured module is the weakest link, never inflated).
 *   • BENCH         — a declared/registered bench references it (0 or 1).
 *   • INVARIANT     — an enrolled traceability invariant traces to it (0 or 1).
 *   • CALL-SITES    — its non-test referencing call-site count, normalized against the
 *                     corpus max (a heavily-USED module is more exercised-in-anger).
 *   PROOF = the mean of the six sub-scores (each pre-normalized to `[0, 1]`).
 *
 *  HOTNESS = AMBITION ÷ max(PROOF, {@link PROOF_FLOOR}). The floor keeps a
 *  zero-proof module's hotness FINITE + comparable (division by 0 would make every
 *  unproven module equally, uselessly infinite); it is small enough that a genuinely
 *  unproven ambitious module still ranks at the very top. Modules are ranked HOTTEST
 *  first; ties break by file id (a total, stable order → a byte-identical artifact).
 *
 * PURITY + DETERMINISM. {@link computeHeatmap} is a PURE FOLD over already-loaded
 * data (the {@link HeatmapInputs} the host assembles: the committed benchmark JSON,
 * the {@link RepoIR}, the per-module test/property/invariant booleans). It reads NO
 * filesystem, NO clock, NO RNG, NO ambient anything. The same inputs fold to the SAME
 * artifact twice — byte-identical. The heavy work (building the IR, scanning the test
 * corpus, reading the JSON) is the HOST's (ADR-0012: the lean engine folds, the host
 * computes); this module is the deterministic fold the host calls.
 *
 * @module
 */

import type { RepoIR, FileId } from './repo-ir.js';
import { rankOf, type AssuranceLevel } from './assurance.js';

/** The artifact format version — bumped on a breaking shape change. */
export const HEATMAP_FORMAT = 1 as const;

/**
 * The PROOF floor in the hotness ratio — a small positive value so a zero-proof
 * module's hotness is FINITE and comparable (never `Infinity`), while still ranking a
 * genuinely unproven ambitious module at the very top. Redlinable data.
 */
const PROOF_FLOOR = 0.05 as const;

/** The per-module already-decided proof signals the HOST measured (booleans + a score). */
export interface ModuleProofSignals {
  /** A governed test file references the module (the host scanned the corpus). */
  readonly hasTestFile: boolean;
  /** A fast-check PROPERTY test references the module. */
  readonly hasPropertyTest: boolean;
  /** A declared/registered bench references the module. */
  readonly hasBench: boolean;
  /** An enrolled traceability invariant traces to the module. */
  readonly hasEnrolledInvariant: boolean;
  /** The module's committed mutation score in `[0, 1]`, or null when unmeasured. */
  readonly mutationScore: number | null;
}

/**
 * The inputs the host assembles for one heatmap run — flat, already-loaded data so
 * the fold is pure. The host owns the heavy reads (the IR build, the corpus scan, the
 * JSON parse); this module owns the deterministic blend.
 */
export interface HeatmapInputs {
  /** The injected repo-IR — the size/complexity/call-site/assurance substrate. */
  readonly ir: RepoIR;
  /**
   * Each substantive module's source byte-length, keyed by FileId. The host measures
   * it (the IR carries no byte count); a module absent here contributes size 0.
   */
  readonly moduleSizes: ReadonlyMap<FileId, number>;
  /**
   * Each module's claim-keyword HIT COUNT (the perf + semantic vocab the hard gates
   * scan), keyed by FileId. The host counts it via the same vocab the gates use; a
   * module absent here contributes 0 hits.
   */
  readonly claimHits: ReadonlyMap<FileId, number>;
  /**
   * Each module's EFFECTIVE assurance level (glob floor raised along import edges),
   * keyed by FileId. A module absent here is treated as the lowest level (`L0`).
   */
  readonly effectiveLevels: ReadonlyMap<FileId, AssuranceLevel>;
  /** Each module's host-measured proof signals, keyed by FileId. */
  readonly proofSignals: ReadonlyMap<FileId, ModuleProofSignals>;
}

/** The AMBITION sub-scores + the blended scalar for one module (each in `[0, 1]`). */
export interface ModuleAmbition {
  readonly size: number;
  readonly complexity: number;
  readonly claimDensity: number;
  readonly assurance: number;
  /** The mean of the four sub-scores. */
  readonly ambition: number;
}

/** One module's place on the heatmap — its ambition, proof, hotness, and the raw signals. */
export interface ModuleHotSpot {
  readonly file: FileId;
  readonly ambition: ModuleAmbition;
  /** The PROOF sub-scores + the blended scalar (each in `[0, 1]`). */
  readonly proof: {
    readonly hasTestFile: number;
    readonly hasPropertyTest: number;
    readonly mutationScore: number;
    readonly hasBench: number;
    readonly hasEnrolledInvariant: number;
    readonly callSites: number;
    /** The mean of the six sub-scores. */
    readonly proof: number;
  };
  /** AMBITION ÷ max(PROOF, floor) — hottest first when ranked. */
  readonly hotness: number;
}

/** The full deterministic heatmap artifact — ADVISORY triage, never a verdict. */
export interface AmbitionProofHeatmap {
  readonly format: typeof HEATMAP_FORMAT;
  /** Always advisory — encoded in the artifact so a reader can never mistake it for a gate verdict. */
  readonly advisory: true;
  /** Every ranked module, hottest (highest ambition÷proof) first. */
  readonly hotSpots: readonly ModuleHotSpot[];
}

/** A module is substantive iff it is a published `packages/<pkg>/src` TypeScript file. */
function isSubstantiveModule(file: FileId): boolean {
  return /^packages\/[^/]+\/src\//.test(file) && file.endsWith('.ts') && !file.endsWith('.d.ts');
}

/** A test/spec file (NOT a substantive module; the call-site count excludes references FROM these). */
function isTestFile(file: FileId): boolean {
  return /(?:^|\/)tests\//.test(file) || /\.(?:test|spec|bench)\.ts$/.test(file);
}

/**
 * Count the SYMBOLS declared in a file — the cheap cyclomatic/cognitive proxy. More
 * declared symbols ⟹ more independently-wrong surface. Pure fold over the IR symbol
 * table (every {@link SymbolNode} carries its declaring `file`).
 */
function symbolCount(ir: RepoIR, file: FileId): number {
  let n = 0;
  for (const [, symbol] of ir.symbols) {
    if (symbol.file === file) n++;
  }
  return n;
}

/**
 * Count the NON-TEST call-sites that reference any symbol declared in `file` — how
 * heavily the module is USED in anger (a proof signal: a module exercised by many
 * production call-sites is more battle-tested than an unreferenced one). Pure fold
 * over the IR reverse-reference index, excluding references FROM test files (a test
 * reference is not production exercise).
 */
function nonTestCallSites(ir: RepoIR, file: FileId): number {
  let n = 0;
  for (const [symbolId, sites] of ir.refs) {
    const symbol = ir.symbols.get(symbolId);
    if (symbol === undefined || symbol.file !== file) continue;
    for (const site of sites) {
      if (!isTestFile(site.fromFile)) n++;
    }
  }
  return n;
}

/** Normalize a raw value against a corpus max into `[0, 1]` (0 when the max is 0). */
function normalize(value: number, max: number): number {
  return max > 0 ? value / max : 0;
}

/** The mean of a non-empty list of `[0, 1]` sub-scores. */
function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Compute the ambition÷proof heatmap — the ONE pure, deterministic fold. Ranks every
 * substantive module hottest-first; the same inputs fold to a byte-identical artifact.
 *
 * The blend is two passes: (1) gather each module's RAW signals (size, symbol count,
 * claim hits, assurance rank, call-sites, the host proof booleans + mutation score),
 * (2) NORMALIZE the corpus-relative signals against their corpus maxima and blend each
 * module's AMBITION + PROOF means, then the hotness ratio. Two passes because the
 * normalization needs the corpus maxima, which are known only after the first pass —
 * a pure, total fold, no I/O, no clock.
 */
export function computeHeatmap(inputs: HeatmapInputs): AmbitionProofHeatmap {
  const { ir, moduleSizes, claimHits, effectiveLevels, proofSignals } = inputs;

  // Pass 1 — gather the RAW per-module signals for every substantive module in the IR.
  interface Raw {
    readonly file: FileId;
    readonly size: number;
    readonly symbols: number;
    readonly claims: number;
    readonly assuranceRank: number;
    readonly callSites: number;
    readonly proof: ModuleProofSignals;
  }
  const raws: Raw[] = [];
  for (const [file] of ir.files) {
    if (!isSubstantiveModule(file)) continue;
    const level: AssuranceLevel = effectiveLevels.get(file) ?? 'L0';
    raws.push({
      file,
      size: moduleSizes.get(file) ?? 0,
      symbols: symbolCount(ir, file),
      claims: claimHits.get(file) ?? 0,
      assuranceRank: rankOf(level),
      callSites: nonTestCallSites(ir, file),
      proof: proofSignals.get(file) ?? {
        hasTestFile: false,
        hasPropertyTest: false,
        hasBench: false,
        hasEnrolledInvariant: false,
        mutationScore: null,
      },
    });
  }

  // The corpus maxima for the relative sub-scores (claim density is hits-per-KB).
  const maxSize = raws.reduce((m, r) => Math.max(m, r.size), 0);
  const maxSymbols = raws.reduce((m, r) => Math.max(m, r.symbols), 0);
  const maxCallSites = raws.reduce((m, r) => Math.max(m, r.callSites), 0);
  // Claim DENSITY (hits per KB) decouples a big file's many hits from a small file's
  // dense ones — the density, not the raw count, is the ambition signal.
  const densityOf = (r: Raw): number => (r.size > 0 ? r.claims / (r.size / 1024) : 0);
  const maxDensity = raws.reduce((m, r) => Math.max(m, densityOf(r)), 0);
  // The assurance rank is normalized against the TOP level (L4), not the corpus max —
  // an all-L2 corpus must not read its L2 modules as maximally critical.
  const maxAssuranceRank = rankOf('L4');

  // Pass 2 — normalize + blend each module's ambition, proof, and hotness.
  const hotSpots: ModuleHotSpot[] = raws.map((r) => {
    const size = normalize(r.size, maxSize);
    const complexity = normalize(r.symbols, maxSymbols);
    const claimDensity = normalize(densityOf(r), maxDensity);
    const assurance = normalize(r.assuranceRank, maxAssuranceRank);
    const ambition = mean([size, complexity, claimDensity, assurance]);

    const hasTestFile = r.proof.hasTestFile ? 1 : 0;
    const hasPropertyTest = r.proof.hasPropertyTest ? 1 : 0;
    // An unmeasured mutation score is the SOUND floor (0) — never inflate proof for a
    // module the host could not measure.
    const mutationScore = r.proof.mutationScore ?? 0;
    const hasBench = r.proof.hasBench ? 1 : 0;
    const hasEnrolledInvariant = r.proof.hasEnrolledInvariant ? 1 : 0;
    const callSites = normalize(r.callSites, maxCallSites);
    const proof = mean([hasTestFile, hasPropertyTest, mutationScore, hasBench, hasEnrolledInvariant, callSites]);

    const hotness = ambition / Math.max(proof, PROOF_FLOOR);
    return {
      file: r.file,
      ambition: { size, complexity, claimDensity, assurance, ambition },
      proof: { hasTestFile, hasPropertyTest, mutationScore, hasBench, hasEnrolledInvariant, callSites, proof },
      hotness,
    };
  });

  // Rank hottest first; ties break by file id — a TOTAL, stable order so the artifact
  // is byte-identical across runs (the determinism rail).
  hotSpots.sort((a, b) =>
    b.hotness !== a.hotness ? b.hotness - a.hotness : a.file < b.file ? -1 : a.file > b.file ? 1 : 0,
  );

  return { format: HEATMAP_FORMAT, advisory: true, hotSpots };
}

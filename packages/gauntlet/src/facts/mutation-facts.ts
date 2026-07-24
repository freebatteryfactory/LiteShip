/**
 * Mutation facts — the pre-computed, host-built evidence the
 * {@link mutationDivergenceGate} folds into {@link Finding}s (Slice C, the avionics
 * tier — mutation-as-divergence).
 *
 * This module defines the {@link MutationFacts} INTERFACE and nothing else. Like
 * {@link RepoIR} and {@link SupplyChainFacts}, it carries no heavy dependency:
 * `@liteship/gauntlet` stays the lean engine, so it never parses a TS AST, generates a
 * mutant, or spawns a test run. A HOST (`@liteship/audit`'s mutation engine + the CLI's
 * vitest runner) does the heavy lifting — generate the deterministic mutant
 * catalogue, run the covering tests per mutant, decide each kill/survive verdict —
 * and hands the engine these flat, already-decided facts. The gate's only job is to
 * FOLD them into Findings at the right (propagated) assurance level, with the
 * kill-floor deciding which severities BLOCK (ADR-0012: the lean engine folds facts;
 * the host computes them).
 *
 * THE BIG IDEA. A mutant is a deliberate SECOND ORACLE: where the original and the
 * mutated code produced IDENTICAL test results when they should have diverged, the
 * mutant SURVIVED — a coverage divergence, the same self-explaining-Finding shape
 * the oracle-divergence gates use. A {@link MutantOutcome} carries the operator + the
 * location + the `originalText`→`mutatedText` rewrite, so the dev/agent sees EXACTLY
 * what survived. REPORT-not-DECIDE: the gate reports the survivor at its level; the
 * human/agent acts.
 *
 * @module
 */

/**
 * The host-supplied mutation evidence over one run. The mutation engine is HEAVY
 * (a vitest run per mutant), so production runs it OPT-IN, scoped to the
 * propagated-L4 seams + cached + shardable; when the host did not run mutation this
 * whole capability is simply ABSENT from the GateContext and the gate is not in the
 * set (no cost, no noise). When present it carries every per-mutant outcome plus the
 * committed score BASELINE the ratchet compares against.
 */
export interface MutationFacts {
  /** Every evaluated mutant's outcome — the substrate the gate folds. */
  readonly outcomes: readonly MutantOutcome[];
  /** Every operator's applicability count for every admitted target, including zero. */
  readonly operatorApplicability: readonly MutationOperatorApplicability[];
  /**
   * The committed per-file mutation-score baseline (the ratchet artifact, e.g.
   * `benchmarks/mutation-score.json`). A file whose freshly-computed score DROPS
   * below its committed baseline is a regression finding (the score may only ever
   * rise). A file absent from the baseline has no ratchet floor (its first
   * measurement establishes the baseline — reported as informational, never a
   * regression). Keyed by the same {@link MutantOutcome.file} ids.
   */
  readonly scoreBaseline: Readonly<Record<string, number>>;
}

/** One explicit operator-applicability census row for an admitted mutation target. */
export interface MutationOperatorApplicability {
  readonly file: string;
  readonly operator: string;
  readonly applicableMutants: number;
}

/**
 * The verdict an evaluated mutant earned — a `_tag` discriminant (composition).
 *  - `killed` — a covering test failed on the mutation (adequate coverage).
 *  - `survived` — every covering test passed (a coverage divergence, a finding).
 *  - `no-coverage` — no test covers the site (the worst signal, a finding).
 *  - `equivalent` — a RUNTIME mutation the engine cannot exclude but that is
 *    provably behaviour-identical to the original (e.g. an unreachable comparator
 *    boundary on always-distinct object keys, or a default-value rewrite that routes
 *    to the same branch). Recorded against a CONTENT-ADDRESSED, justified registry
 *    entry — NEVER a fake test. An `equivalent` mutant is excluded from BOTH the
 *    survivor work-list AND the score denominator (it is not a coverage gap), yet it
 *    is RECORDED + reviewable. It is distinct from `killed`: a killed mutant proves a
 *    test exists; an equivalent mutant proves no test COULD exist (there is nothing to
 *    observe). Type-level (erased) mutations are excluded at the SOURCE by the engine
 *    and never reach a verdict; `equivalent` is only ever a justified RUNTIME mutant.
 */
export type MutantVerdictTag = 'killed' | 'survived' | 'no-coverage' | 'equivalent';

/**
 * One evaluated mutant's flat, decided outcome — the host's verdict plus the data
 * the gate needs to write a self-explaining Finding. A `killed` outcome is adequate
 * coverage (no finding); a `survived` or `no-coverage` outcome is a coverage
 * divergence the gate reports.
 */
export interface MutantOutcome {
  /** The mutant's stable content address (the host's blake3 id) — traceability. */
  readonly mutantId: string;
  /** The verdict — `killed` (adequate) / `survived` / `no-coverage` (both findings). */
  readonly verdict: MutantVerdictTag;
  /** The repo-relative file the mutant lives in — MUST be an IR file (the gate aims its level). */
  readonly file: string;
  /** 1-based line of the mutated span (the finding's location). */
  readonly line: number;
  /** 1-based column of the mutated span. */
  readonly column: number;
  /** The mutation operator id (e.g. `conditional-boundary`) — names WHAT was mutated. */
  readonly operator: string;
  /** The exact original source text of the mutated span. */
  readonly originalText: string;
  /** The text the span was replaced with — the `original → mutated` the reader sees. */
  readonly mutatedText: string;
  /** Sorted tests mapped to this site, even when an equivalent registry bypasses execution. */
  readonly coveringTests: readonly string[];
  /** Human proof for an equivalent mutant; null for every executable verdict. */
  readonly equivalentJustification: string | null;
  /** Content address of the mutant-bound equivalent proof; null for non-equivalents. */
  readonly equivalentJustificationDigest: string | null;
  /** Proven mutation-subsumption parents. Empty means no subsumption is claimed. */
  readonly subsumedBy: readonly string[];
}

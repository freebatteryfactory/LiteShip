/**
 * Mutation facts — the pre-computed, host-built evidence the
 * {@link mutationDivergenceGate} folds into {@link Finding}s (Slice C, the avionics
 * tier — mutation-as-divergence).
 *
 * This module defines the {@link MutationFacts} INTERFACE and nothing else. Like
 * {@link RepoIR} and {@link SupplyChainFacts}, it carries no heavy dependency:
 * `@czap/gauntlet` stays the lean engine, so it never parses a TS AST, generates a
 * mutant, or spawns a test run. A HOST (`@czap/audit`'s mutation engine + the CLI's
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

/** The verdict an evaluated mutant earned — a `_tag` discriminant (composition). */
export type MutantVerdictTag = 'killed' | 'survived' | 'no-coverage';

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
}

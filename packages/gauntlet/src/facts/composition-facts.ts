/**
 * Composition-coverage facts — the pre-computed, host-injected INTERACTION-EDGE
 * evidence the {@link compositionCoverageGate} folds into {@link Finding}s (the
 * LOCAL-VS-GLOBAL correctness family — "locally green, globally untested
 * interaction").
 *
 * This module defines the {@link CompositionFacts} INTERFACE and nothing else.
 * Like {@link RepoIR} and {@link MutationFacts}, it carries NO heavy dependency:
 * `@liteship/gauntlet` stays the lean engine, so it never builds a call graph, scans the
 * test corpus, or runs a coverage probe. A HOST (the CLI's `liteship check gates --ir
 * --composition` path) derives the interaction edges from the IR call/import graph,
 * decides which units are individually tested, and decides which edges an
 * integration test exercises TOGETHER, then hands the engine these flat,
 * already-decided facts. The gate's only job is to FOLD the uncovered edges into
 * Findings at the edge's (propagated) level (ADR-0012: the lean engine folds facts;
 * the host computes them).
 *
 * THE BIG IDEA + ITS EXACT DEFINITION (honesty about what is computed). Two units
 * can each be individually green — `A` has tests, `B` has tests — while NO test
 * exercises the COMPOSITION `A → B` (the call from `A` into `B`). The interaction is
 * locally proven on both sides but globally untested. The host computes:
 *
 *   uncovered-composition-edges =
 *     { (A, B) : A calls into B in the IR call graph
 *                AND A is individually tested
 *                AND B is individually tested
 *                AND no integration test exercises A and B TOGETHER }
 *
 * THE HONEST LIMIT (stated, never over-claimed). "Exercises A and B together" means
 * a single test in whose EXECUTION both endpoints appear. The PRECISE signal is a
 * per-test execution-coverage probe (a test whose v8 coverage shows both endpoints'
 * function bodies executed) — {@link CoverageEvidence}'s `execution` tag. When a
 * precise probe is unavailable, the host falls back to the SOUNDEST static proxy —
 * a test that statically REFERENCES both endpoints (imports/names both) — tagged
 * `static-reference`, and the finding STATES the proxy was used. This is an
 * over-approximation of integration coverage: a `static-reference`-covered edge MAY
 * still be untested in execution (the test names both but never drives the call),
 * so a `static-reference` "covered" edge is NOT a proof of integration coverage —
 * it is the conservative direction (it only ever SUPPRESSES a finding when there is
 * at least a test that touches both, never invents coverage out of nothing). The
 * gate reports the edge + WHICH evidence class decided it, so the reader can demand
 * the precise probe for a trust-spine edge. The gate never claims more than the
 * host measured.
 *
 * @module
 */

/**
 * The composition evidence the host supplies — the interaction edges between
 * individually-tested units, each already classified covered/uncovered. The host
 * derives the edges from the IR call/import graph and the individually-tested set
 * from the test corpus; the gate folds the UNCOVERED ones into findings. An
 * empty/absent `edges` is reported by the gate as an advisory "not-evidenced"
 * finding (honest under-coverage, never a silent green) — see
 * {@link compositionCoverageGate}.
 */
export interface CompositionFacts {
  /** Every interaction edge between two individually-tested units the host classified. */
  readonly edges?: readonly InteractionEdge[];
}

/**
 * One interaction edge `from → to` between two individually-tested units, with the
 * host's integration-coverage verdict. By construction every edge here has BOTH
 * endpoints individually tested (the host filters to those — an edge whose endpoint
 * is itself untested is a different, weaker finding the proof-propagation family
 * owns); the only question this edge answers is whether the COMPOSITION is covered
 * TOGETHER. An `integrationCovered: false` edge is the finding.
 */
export interface InteractionEdge {
  /** The calling unit's file id — MUST be an IR file (the gate aims the level + reads deps). */
  readonly fromFile: string;
  /** The called unit's file id — MUST be an IR file. */
  readonly toFile: string;
  /**
   * The symbol in `toFile` that `fromFile` calls/references (names WHAT the
   * interaction is, so the finding is concrete — `applyPatch`, not just `to.ts`).
   */
  readonly viaSymbol: string;
  /**
   * Whether an integration test exercises BOTH endpoints together. `false` is the
   * finding (a locally-green, globally-untested interaction). When `true`, the
   * {@link evidence} states HOW it was decided (precise execution vs the static
   * over-approximation), so a "covered" verdict can never be read as stronger than
   * the proxy that produced it.
   */
  readonly integrationCovered: boolean;
  /**
   * How the integration-coverage verdict was evidenced — the honesty knob. A
   * `covered` edge carries the evidence class that decided it; an `uncovered` edge
   * carries the strongest class the host SEARCHED (so the finding states what was
   * looked for and not found).
   */
  readonly evidence: CoverageEvidence;
}

/**
 * How an integration-coverage verdict was evidenced — the provenance-honesty model,
 * sibling to {@link CoverageClass}. A `_tag` discriminant (composition):
 *  - `execution` — a test whose EXECUTION coverage shows BOTH endpoints' bodies ran
 *    (the precise signal; a v8 per-test probe). The strongest evidence.
 *  - `static-reference` — a test that statically REFERENCES both endpoints (imports
 *    or names both) but with no execution probe. The SOUND over-approximation: it
 *    may name both without driving the call, so a `static-reference` "covered" edge
 *    is NOT proof of integration coverage — it only suppresses the finding when at
 *    least one test touches both endpoints. The finding STATES this class was used.
 *  - `none` — no test references both endpoints at all (the strongest `uncovered`
 *    signal: not even a test that mentions both).
 */
export type CoverageEvidence =
  | { readonly _tag: 'execution'; readonly testId: string }
  | { readonly _tag: 'static-reference'; readonly testId: string }
  | { readonly _tag: 'none' };

/** The evidence classes in ascending strength — canonical ordering for display/sort. */
export const COVERAGE_EVIDENCE_STRENGTH = ['none', 'static-reference', 'execution'] as const;

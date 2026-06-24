/**
 * MC/DC facts — the pre-computed, host-built CONDITION-coverage evidence the
 * {@link mcdcCoverageGate} folds into {@link Finding}s (the avionics tier — DO-178B
 * Level A's Modified Condition/Decision Coverage, realized as condition-level
 * mutation).
 *
 * This module defines the {@link McdcFacts} INTERFACE and nothing else. Like
 * {@link RepoIR} / {@link MutationFacts} / {@link SupplyChainFacts}, it carries no heavy
 * dependency: `@czap/gauntlet` stays the lean engine, so it never parses a TS AST,
 * generates a condition-mutant, or spawns a test run. A HOST (`@czap/audit`'s
 * condition-mutation engine + the CLI's per-mutant vitest runner) does the heavy
 * lifting — decompose every L4 decision into its atomic conditions, mint the
 * force-true/force-false pin per condition, run the covering tests per pin, decide each
 * kill/survive verdict, and fold the two pins per condition into a single
 * {@link McdcConditionOutcome} — and hands the engine these flat, already-decided facts.
 * The gate's only job is to FOLD them into Findings at the right (propagated) assurance
 * level, with L4 requiring FULL MC/DC (every condition's independent effect observed).
 *
 * THE MC/DC RULE (per atomic condition of a decision): the condition's INDEPENDENT
 * EFFECT on the decision's outcome is OBSERVED by the suite iff BOTH its force-true and
 * its force-false condition-mutant were KILLED. A KILLED force-true pin proves a
 * covering test's outcome depends on this condition being true at this decision; a
 * KILLED force-false pin, symmetrically, on it being false. Two kills ⇒ MC/DC-covered
 * for that condition. A SURVIVING pin (the test passed on the pinned code) or a
 * NO-COVERAGE pin (no test covers the condition at all) ⇒ the independent effect is NOT
 * observed ⇒ an MC/DC GAP the gate reports at the condition's location. REPORT-not-
 * DECIDE: the gate names the uncovered condition + which pin survived; the human/agent
 * writes the missing distinguishing test. Sound (a surviving pin is always a real gap,
 * never a false green) and the established condition-mutation approximation of MC/DC
 * (masking-MC/DC for short-circuit decisions — see `@czap/audit`'s `mcdc-engine.ts`).
 *
 * @module
 */

/**
 * The host-supplied MC/DC evidence over one run. The condition-mutation engine is HEAVY
 * (a vitest run per pin, two pins per condition), so production runs it OPT-IN, scoped to
 * the propagated-L4 seams + cached + shardable; when the host did not run it this whole
 * capability is simply ABSENT from the GateContext and the gate is not in the set (no
 * cost, no noise). When present it carries every per-condition outcome (both pins'
 * verdicts folded) — the substrate the gate folds into MC/DC-gap Findings.
 */
export interface McdcFacts {
  /** Every L4 decision's atomic conditions, each with both pins' folded verdict. */
  readonly conditions: readonly McdcConditionOutcome[];
}

/**
 * The kill/survive verdict tag a single condition-mutant pin earned — the same `_tag`
 * discriminant the mutation verdict uses (composition), restricted to the three the
 * MC/DC fold reads: a pin is never `equivalent` (a forced constant is, by construction,
 * a behaviour change at a reachable decision — there is no justified-equivalent pin).
 *  - `killed` — a covering test failed on the pinned code (the pin's effect is observed).
 *  - `survived` — every covering test passed on the pinned code (the effect is NOT
 *    observed at this pin — half the MC/DC pair is missing).
 *  - `no-coverage` — no test covers the condition at all (the worst signal — the
 *    decision is entirely untested).
 */
export type McdcPinVerdict = 'killed' | 'survived' | 'no-coverage';

/**
 * One atomic CONDITION's folded MC/DC outcome — the two pins' verdicts plus the data the
 * gate needs to write a self-explaining Finding. A condition is MC/DC-COVERED iff BOTH
 * {@link forceTrueVerdict} and {@link forceFalseVerdict} are `killed`; ANY other
 * combination is an MC/DC gap (the gate names which pin(s) failed and at what severity).
 */
export interface McdcConditionOutcome {
  /**
   * The stable content address of the condition (the host's blake3 over the
   * `(file, line, column, conditionText)` identity, force-independent) — traceability +
   * the gate's de-dup key. Distinct from either pin's mutant id (a pin folds INTO this).
   */
  readonly conditionId: string;
  /** The repo-relative file the decision lives in — MUST be an IR file (the gate aims its level). */
  readonly file: string;
  /** 1-based line of the atomic condition's source span (the finding's location). */
  readonly line: number;
  /** 1-based column of the atomic condition's source span. */
  readonly column: number;
  /** The full source text of the enclosing DECISION (so the reader sees the whole branch). */
  readonly decision: string;
  /** The full source text of THIS atomic condition (the leaf the pins force). */
  readonly condition: string;
  /** The verdict of the force-TRUE pin — `killed` ⇒ the true-effect is observed. */
  readonly forceTrueVerdict: McdcPinVerdict;
  /** The verdict of the force-FALSE pin — `killed` ⇒ the false-effect is observed. */
  readonly forceFalseVerdict: McdcPinVerdict;
}

/**
 * Is a condition MC/DC-COVERED? Both pins must be KILLED — the suite distinguishes the
 * condition being true from being false at the decision (the independent-effect pair).
 * Any survived/no-coverage pin ⇒ not covered ⇒ an MC/DC gap. A pure predicate over the
 * folded outcome (no I/O), exported so the gate and the host's score share ONE rule.
 */
export function isMcdcCovered(outcome: McdcConditionOutcome): boolean {
  return outcome.forceTrueVerdict === 'killed' && outcome.forceFalseVerdict === 'killed';
}

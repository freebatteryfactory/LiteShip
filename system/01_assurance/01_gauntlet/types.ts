/**
 * Gauntlet: evidence evaluation.
 *
 * Gauntlet reads facts against the checks one invocation asked for and produces
 * one result recording what happened. It acquires nothing: no compiler lane, no
 * filesystem, no source control appears in this file, which is why it can run
 * anywhere the audit product can be shipped.
 *
 * It issues no authority, and there is no type here that certifies a result. A
 * passing result *is* the evidence, and an object standing beside it to say so
 * was a badge describing evidence.
 *
 * **A check is worth nothing until evidence shows it detects the failure class
 * it claims.** A guard that still passes when its protected relationship is
 * broken cannot qualify itself. The umbrella owns the
 * demonstration vocabulary; this home is where a claim, its proof, and its
 * evaluation become one population.
 *
 * @module
 */

import type {
  Algebra,
  CaseOf,
  NonEmptyTuple,
  Refine,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Evidence } from '../../../00_core/06_evidence/types.js';
import type { WorkspaceSnapshotId, WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type {
  AssuranceFactName,
  AssuranceRunSpec,
  CheckConsequence,
  DemonstratedGate,
  EvaluatedGate,
  EvidenceProfile,
  FailureClassReference,
  Finding,
  GateDefinition,
  GateId,
  GateOutcome,
  GateRevisionId,
  PlannedCheck,
} from '../types.js';

/**
 * One gate evaluated against one snapshot.
 *
 * The facts actually read are recorded beside the outcome, so a conclusion can
 * be traced to its inputs rather than believed. `Evidence` is retained rather
 * than unwrapped: a gate that concluded from an unavailable fact is a
 * different event than one that concluded from a present one.
 */
export interface GateEvaluation<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> {
  readonly gate: EvaluatedGate<Id, Revision, Claims>;
  readonly outcome: GateOutcome;
  readonly read: readonly { readonly fact: AssuranceFactName; readonly value: Evidence<ContentAddress> }[];
  readonly findings: readonly Finding[];
}

/**
 * An evaluation whose outcome is pinned to the satisfied arm.
 *
 * `Refine` rejects a change that narrows nothing, so this cannot decay into an
 * alias for the evaluation it constrains; a law below also pins that it did not
 * resolve to `never`.
 */
export type SatisfiedEvaluation<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> = Refine<
  GateEvaluation<Id, Revision, Claims>,
  {
    readonly outcome: CaseOf<GateOutcome, 'satisfied'>;
    readonly gate: DemonstratedGate<Id, Revision, Claims>;
  }
>;

/** An evaluation that did not satisfy: refuted, or unable to resolve. */
export type UnsatisfiedEvaluation<
  Id extends GateId = GateId,
  Revision extends GateRevisionId = GateRevisionId,
  Claims extends NonEmptyTuple<FailureClassReference> = NonEmptyTuple<FailureClassReference>,
> = Refine<
  GateEvaluation<Id, Revision, Claims>,
  { readonly outcome: Exclude<GateOutcome, CaseOf<GateOutcome, 'satisfied'>> }
>;

/**
 * One evaluation per planned check, positionally, each about that check's gate.
 *
 * A homomorphic mapping over a tuple preserves arity, so a spec naming three
 * checks admits exactly three evaluations — not two, not four, and not five
 * evaluations of the same gate, which a bare `readonly GateEvaluation[]` and
 * even a `NonEmptyTuple` both admit. The per-position `infer` is what makes it
 * the *right* three: position two carries an evaluation of the gate named at
 * position two.
 */
export type PlannedEvaluations<Checks extends NonEmptyTuple<PlannedCheck>> = {
  readonly [Position in keyof Checks]: Checks[Position] extends PlannedCheck<
    infer Id,
    infer Revision,
    infer Claims
  >
    ? GateEvaluation<Id, Revision, Claims>
    : never;
};

/**
 * The evaluation shapes one planned check admits, named once.
 *
 * Both refinements read the planned check through the same `infer` as
 * {@link PlannedEvaluations}, and the two positional mappings below reuse that
 * type rather than restating it.
 *
 * That is not tidiness. Both mappings previously inlined their own copy of the
 * correspondence, which left `PlannedEvaluations` with no consumer outside its
 * own law — declared, documented, law-covered, and composed by nothing, which is
 * a shape this repository has deleted before. Measured at the time: dropping the
 * revision from `PlannedEvaluations` broke nothing but `noUnusedLocals`, because
 * no carrier was reading it.
 */
type SatisfiedEvaluationOf<Check extends PlannedCheck> = Check extends PlannedCheck<
  infer Id,
  infer Revision,
  infer Claims
>
  ? SatisfiedEvaluation<Id, Revision, Claims>
  : never;

type UnsatisfiedEvaluationOf<Check extends PlannedCheck> = Check extends PlannedCheck<
  infer Id,
  infer Revision,
  infer Claims
>
  ? UnsatisfiedEvaluation<Id, Revision, Claims>
  : never;

/**
 * The planned population, with one required position unsatisfied.
 *
 * A union over the positions a run is allowed to be blocked by: for each planned
 * check whose consequence admits `required`, the tuple in which that position
 * holds an unsatisfied evaluation and every other position holds its ordinary
 * planned one. Informational positions contribute `never` and drop out of the
 * union, so an exact all-informational specification cannot inhabit the blocked
 * arm at all.
 *
 * This replaces a member. The blocked arm carried `evaluations` derived from the
 * specification *and* `unsatisfied: NonEmptyTuple<UnsatisfiedEvaluation>` as a
 * second, free population, with nothing relating them. The type could therefore
 * say: every required planned check was satisfied, one unplanned gate came out
 * unsatisfied, result blocked. It could block on an informational check, on the
 * same foreign gate repeated, or on a gate absent from the specification
 * entirely — the exact positional population saying what ran, and a curated
 * roster beside it deciding what that meant.
 *
 * That is the pattern the specification work existed to delete, surviving one
 * member to the left of where it was deleted. The remedy is not a law relating
 * the two populations. There is one population.
 *
 * `unsatisfied` as a *reading* of a result is still perfectly available: it is
 * the positions whose evaluations are in a non-satisfied arm. Deriving it when
 * explaining a result is a projection. Authoring it beside the evaluations was a
 * second roster.
 */
export type BlockedPlannedEvaluations<Checks extends NonEmptyTuple<PlannedCheck>> = {
  readonly [Blocking in keyof Checks]: 'required' extends Checks[Blocking]['consequence']
    ? {
        readonly [Position in keyof Checks]: Position extends Blocking
          ? UnsatisfiedEvaluationOf<Checks[Position]>
          : PlannedEvaluations<Checks>[Position];
      }
    : never;
}[number];

/**
 * The same correspondence, with every *required* position pinned to satisfied.
 *
 * This is what makes `passed` mean something. A run that requested three checks,
 * required two of them, and reports a passing result must carry satisfied
 * evaluations in exactly those two positions; the informational position may
 * carry any honest outcome, including one that could not resolve.
 *
 * When the consequence is not a literal — the broad `AssuranceRunSpec`, where
 * `consequence` is the whole union — no position is pinned. That is the correct
 * permissiveness and not a hole: the broad spec is the case where nobody has
 * said yet what this run requires, and a type should not invent the answer.
 */
export type SatisfiedPlannedEvaluations<Checks extends NonEmptyTuple<PlannedCheck>> = {
  readonly [Position in keyof Checks]: Checks[Position]['consequence'] extends 'required'
    ? SatisfiedEvaluationOf<Checks[Position]>
    : PlannedEvaluations<Checks>[Position];
};

/**
 * Every planned position satisfied, whatever this run said it required.
 *
 * `passed` means *what this run required came out satisfied*, which is the
 * right meaning for a run and the wrong prerequisite for a shipment. A spec
 * whose every check is informational narrows no position, so a run in which a
 * check was refuted still produces a `passed` result — correctly, because the
 * run did not require that answer.
 *
 * A release is a different question. It is not asking whether some invocation
 * got what it asked for; it is asking whether anything came out wrong. This is
 * that question, and it is why an editor-grade run cannot qualify a shipment
 * even when it passed: informational positions are held to the same standard
 * here, so a refuted check blocks a release while still not blocking the
 * editor invocation that ran it.
 */
export type FullySatisfiedEvaluations<Checks extends NonEmptyTuple<PlannedCheck>> = {
  readonly [Position in keyof Checks]: SatisfiedEvaluationOf<Checks[Position]>;
};

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

// `GauntletVerdict` was declared here and is gone. It was `passed | blocked`
// carrying advisories and a blocking population — a strict subset of what
// `AssuranceResult` already carries, produced by the same act, with nothing
// making the two agree. Grep found no consumer but its own law and the type
// surface: a conclusion declared twice, read once, and composed by nothing.
//
// Its negative was worth more than it was, and moved to
// `TheResultHasNoMiddleArm` below.

/**
 * The one addressed product of one evaluation over one exact snapshot.
 *
 * This replaces two. `GauntletRun` and `AssuranceReceipt` both carried the
 * snapshot, the evaluation population, verdict-shaped information, and the
 * authority — two products of one act, obliged to agree, with nothing making
 * them. That obligation was written in prose and enforced by nobody, which is
 * the shape this repository keeps deleting.
 *
 * Authority lives in the `passed` arm and only there. It is not a member that
 * happens to be `unearned` when things went badly; a blocked run has no
 * authority to carry, and saying so structurally is what stops a consumer
 * reading the member and asking politely whether it is earned.
 *
 * Both arms carry the exact snapshot, so a result cannot be quoted about a
 * revision it never saw.
 *
 * There is no `authority` member. It carried the snapshot the result already
 * carries, and a non-empty population of gates that had demonstrated something —
 * both of which the passed arm now owns directly, the second by requiring every
 * required position to hold a demonstrated gate. A passing result *is* the
 * publication evidence; a second object certifying that it is one was a badge
 * describing evidence rather than evidence.
 *
 * Both arms also carry the exact spec, for the same reason and against a
 * different failure. Without it, a result is a claim that *some* checks passed
 * over this revision, and an editor run with one informational check produces a
 * technically passing result indistinguishable from a release run. The spec is
 * carried whole rather than as a reference because the evaluation population is
 * derived from its check population: `evaluations` is one entry per planned
 * check, positionally, so "nothing ran" cannot arrive downstream as "nothing
 * failed" — which was previously representable, because `evaluations` was an
 * array that could be empty.
 *
 * `unsatisfied` on the blocked arm replaces `blocking`. Nothing blocks any more;
 * a required check was not satisfied and the run says which, and the consequence
 * of that belongs to whoever asked.
 */
export type AssuranceResult<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Algebra<{
  passed: {
    readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
    readonly spec: Spec;
    readonly evaluations: SatisfiedPlannedEvaluations<Spec['checks']>;
    readonly address: ContentAddress<'application/vnd.liteship.assurance-result+cbor'>;
  };
  blocked: {
    readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
    readonly spec: Spec;
    readonly evaluations: BlockedPlannedEvaluations<Spec['checks']>;
    readonly diagnostics: readonly Diagnostic[];
    readonly address: ContentAddress<'application/vnd.liteship.assurance-result+cbor'>;
  };
}>;

/**
 * A passing result in which nothing came out wrong.
 *
 * The narrower prerequisite a shipment consumes. `passed` answers the run's
 * question; this answers the release's. The two differ exactly on the
 * informational positions, and that difference is the whole escape it closes:
 * a specification of one informational check produces a passing result whose
 * single evaluation may be `refuted`, and the broad qualification arm accepted
 * it. A release then consumed a candidate whose only assurance run contained a
 * known defect, with every law in the repository green.
 */
export type ReleaseGradeResult<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Refine<
  CaseOf<AssuranceResult<Snapshot, Spec>, 'passed'>,
  { readonly evaluations: FullySatisfiedEvaluations<Spec['checks']> }
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the assurance topology. */
export interface GauntletTypeSurface {
  readonly definition: GateDefinition;
  readonly evaluated: EvaluatedGate;
  readonly demonstrated: DemonstratedGate;
  readonly evaluation: GateEvaluation;
  readonly profile: EvidenceProfile;
  readonly consequence: CheckConsequence;
  readonly plannedCheck: PlannedCheck;
  readonly spec: AssuranceRunSpec;
  readonly result: AssuranceResult;
}

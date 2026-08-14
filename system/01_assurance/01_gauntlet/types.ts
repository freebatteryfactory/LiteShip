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
 * One idea from the deleted harness survives here, and only one. Five hundred
 * and seventy-one mutation scripts and a bespoke runner were an
 * implementation, and implementations are quarry. The durable relation they
 * were reaching for is that **a check is worth nothing until evidence shows it
 * detects the failure class it claims**, because this repository has repeatedly
 * written guards that pass with the guard removed. The umbrella owns the
 * demonstration vocabulary; this home is where a claim, its proof, and its
 * evaluation become one population.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  CaseOf,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  Refine,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Evidence } from '../../../00_core/06_evidence/types.js';
import type { WorkspaceSnapshotId, WorkspaceSnapshotReference } from '../../00_workspace/types.js';
import type {
  AssuranceFactName,
  AssuranceRunSpec,
  AssuranceRunSpecId,
  CheckConsequence,
  DemonstratedClaimProofs,
  DemonstratedGate,
  EvaluatedGate,
  EvidenceProfile,
  FailureClassId,
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
// Laws
// ---------------------------------------------------------------------------

/**
 * A result is passed or blocked, with nothing in between.
 *
 * The absent third arm is the law, and it outlived the type it was written
 * about. `passed-with-warnings` is the shape that turns a required check into a
 * suggestion over time: the arm appears for one legitimate reason, accumulates,
 * and eventually the required population is empty and nobody decided that.
 *
 * `degraded` is checked for the same reason and a sharper one — a `degradation`
 * member was deleted from both arms in this commit, and a tag is the obvious
 * place for it to reappear.
 */
export type TheResultHasNoMiddleArm = Assert<
  Equal<
    [
      Equal<TagOf<AssuranceResult>, 'passed' | 'blocked'>,
      'passed-with-warnings' extends TagOf<AssuranceResult> ? true : false,
      'degraded' extends TagOf<AssuranceResult> ? true : false,
      'degradation' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'advisories' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'degradation' extends keyof CaseOf<AssuranceResult, 'blocked'> ? true : false,
      Equal<GateEvaluation['findings'], readonly Finding[]>,
    ],
    [true, false, false, false, false, false, true]
  >
>;

/**
 * A gate definition is exact over its identity.
 *
 * The third line is the anti-vacuity partner: without it the law passes when
 * the evaluation stops threading the parameter through, which is the erasure
 * defect the host layer paid four folds to close.
 */
export type AGateDefinitionIsExactOverItsIdentity = Assert<
  Equal<
    [
      GateDefinition<GateId<'a'>> extends GateDefinition<GateId<'b'>> ? true : false,
      GateDefinition<GateId<'a'>> extends GateDefinition<GateId<'a'>> ? true : false,
      GateEvaluation<GateId<'a'>> extends GateEvaluation<GateId<'b'>> ? true : false,
      GateEvaluation extends GateEvaluation<GateId<'a'>> ? true : false,
    ],
    [false, true, false, false]
  >
>;

type GateLawA = GateId<'law.gate.a'>;

type GateLawB = GateId<'law.gate.b'>;
type SnapshotLawA = WorkspaceSnapshotId<'law.snapshot.a'>;
type RevisionLawOne = GateRevisionId<'law.revision.1'>;
type RevisionLawTwo = GateRevisionId<'law.revision.2'>;
type RequiredCheckA = Refine<
  PlannedCheck<GateLawA, RevisionLawOne>,
  { readonly consequence: 'required' }
>;
type RequiredCheckB = Refine<
  PlannedCheck<GateLawB, RevisionLawTwo>,
  { readonly consequence: 'required' }
>;
type InformationalCheckB = Refine<
  PlannedCheck<GateLawB, RevisionLawTwo>,
  { readonly consequence: 'informational' }
>;
type SpecLawA = AssuranceRunSpec<AssuranceRunSpecId<'law.spec.a'>, readonly [RequiredCheckA]>;
type SpecLawB = AssuranceRunSpec<AssuranceRunSpecId<'law.spec.b'>, readonly [RequiredCheckA]>;

/**
 * A result carries one evaluation per planned check, positionally.
 *
 * Line one is the correspondence and doubles as the anti-vacuity guard, since a
 * mapping that degenerated to `never` would not equal a written tuple. Lines two
 * through four are what the previous `readonly GateEvaluation[]` admitted and
 * this does not: a result with fewer evaluations than the spec requested, a
 * result that ran the same gate twice instead of the two that were asked for,
 * and an unbounded population that says only that something happened.
 */
export type AResultCarriesOneEvaluationPerPlannedCheck = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          PlannedEvaluations<readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]>,
          readonly [GateEvaluation<GateLawA>, GateEvaluation<GateLawB>]
        >,
        readonly [GateEvaluation<GateLawA>] extends PlannedEvaluations<
          readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]
        >
          ? true
          : false,
        readonly [GateEvaluation<GateLawA>, GateEvaluation<GateLawA>] extends PlannedEvaluations<
          readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]
        >
          ? true
          : false,
        readonly GateEvaluation[] extends PlannedEvaluations<
          readonly [PlannedCheck<GateLawA>, PlannedCheck<GateLawB>]
        >
          ? true
          : false,
      ],
      [true, false, false, false]
    >
  >
>;

/**
 * A passing result satisfied every check the run required.
 *
 * Line one pins the mapping: the required position narrows to a satisfied
 * evaluation, the informational position does not. Line two is the refusal that
 * makes `passed` mean anything — an evaluation that merely exists cannot occupy
 * a required slot. Line three is the lawful control, without which the law would
 * be satisfied by a shape nobody can build.
 *
 * Lines four and five are not decoration. `Refine` resolves to `never` for a
 * change that narrows nothing, `never` is assignable everywhere, and a
 * `SatisfiedEvaluation` that had quietly become `never` would make line two
 * false for the wrong reason while every other assertion here still passed.
 */
export type APassingResultSatisfiesEveryRequiredCheck = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          SatisfiedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>,
          readonly [
            SatisfiedEvaluation<GateLawA, RevisionLawOne>,
            GateEvaluation<GateLawB, RevisionLawTwo>,
          ]
        >,
        readonly [
          GateEvaluation<GateLawA, RevisionLawOne>,
          GateEvaluation<GateLawB, RevisionLawTwo>,
        ] extends SatisfiedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>
          ? true
          : false,
        readonly [
          SatisfiedEvaluation<GateLawA, RevisionLawOne>,
          GateEvaluation<GateLawB, RevisionLawTwo>,
        ] extends SatisfiedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>
          ? true
          : false,
        [SatisfiedEvaluation] extends [never] ? true : false,
        [UnsatisfiedEvaluation] extends [never] ? true : false,
      ],
      [true, false, true, false, false]
    >
  >
>;

/**
 * A required check in a passing result carries a demonstrated gate.
 *
 * This is the relation the whole self-demonstration apparatus exists for, and
 * until now it lived in a `qualification` member that any evaluation could set
 * to `untested` while the run reported passing.
 *
 * Line one is the refusal: an evaluation whose gate has merely *acquired* proof
 * evidence — including `unavailable`, which is to say none — cannot occupy a
 * required position. Line two is the lawful control. Line three pins that the
 * satisfied outcome is still required alongside the proof, so neither half of
 * the refinement can be dropped while the other carries the law.
 */
export type ARequiredCheckCarriesADemonstratedGate = Assert<
  IsExactlyTrue<
    Equal<
      [
        Refine<GateEvaluation<GateLawA>, { readonly outcome: CaseOf<GateOutcome, 'satisfied'> }> extends
          SatisfiedEvaluation<GateLawA>
          ? true
          : false,
        SatisfiedEvaluation<GateLawA> extends GateEvaluation<GateLawA> ? true : false,
        Equal<SatisfiedEvaluation<GateLawA>['outcome'], CaseOf<GateOutcome, 'satisfied'>>,
        Equal<SatisfiedEvaluation<GateLawA>['gate'], DemonstratedGate<GateLawA>>,
        [SatisfiedEvaluation<GateLawA>] extends [never] ? true : false,
      ],
      [false, true, true, true, false]
    >
  >
>;

type ClaimsLawXY = readonly [
  FailureClassReference<FailureClassId<'law.class.x'>>,
  FailureClassReference<FailureClassId<'law.class.y'>>,
];
type ClaimsLawW = readonly [FailureClassReference<FailureClassId<'law.class.w'>>];
type ClaimedCheckXY = Refine<
  PlannedCheck<GateLawA, RevisionLawOne, ClaimsLawXY>,
  { readonly consequence: 'required' }
>;

/** The proofs a passing result demands at the position that check occupies. */
type DemandedProofsXY = SatisfiedPlannedEvaluations<
  readonly [ClaimedCheckXY]
>[0]['gate']['proofs'];

/**
 * Compile-time law: the exact claim population survives all the way to the
 * passing result.
 *
 * This is the law whose absence let the whole demonstration apparatus be
 * bypassed. `ClaimProofs` correlates a gate's claims with its proofs
 * positionally, and `TheEvaluatedGateCarriesTheCorrelatedProofs` proves that
 * mapping correct — but it proves it at a literal fixture, and every carrier
 * downstream instantiated `EvaluatedGate<Id, Revision>` with the claim
 * population left at its broad default. Both members then widened together: a
 * gate declaring three claims and carrying one proof for an unrelated failure
 * class satisfied `DemonstratedGate`, and could occupy a required position in a
 * passing result that release consumes.
 *
 * That is this repository's signature defect — a relationship proved by hand
 * beside the carrier that hands consumers the broad form — committed at the one
 * place where the consequence is a shipment.
 *
 * Line one is the fact: the population the run planned is the population the
 * result demands. Line two is what makes it a measurement rather than a
 * restatement — a foreign class of the same arity is refused, so the law
 * distinguishes this population from a neighbouring one instead of merely
 * observing that some population arrived. Line three is the anti-vacuity
 * partner, because a projector that silently resolved to `never` would satisfy
 * both of the others.
 */
export type TheExactClaimPopulationReachesThePassingResult = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<DemandedProofsXY, DemonstratedClaimProofs<ClaimsLawXY, RevisionLawOne>>,
        Equal<DemandedProofsXY, DemonstratedClaimProofs<ClaimsLawW, RevisionLawOne>>,
        [DemandedProofsXY] extends [never] ? true : false,
      ],
      [true, false, false]
    >
  >
>;

/**
 * A result is exact over the specification it ran, not only over the snapshot.
 *
 * Without this axis a result says that *some* checks passed over this revision,
 * and an editor invocation with one informational check produces a technically
 * passing result that is assignable everywhere a release-grade one is. Line
 * three is the anti-vacuity partner for the carrier dropping the parameter.
 */
export type AnAssuranceResultIsExactOverItsSpecification = Assert<
  IsExactlyTrue<
    Equal<
      [
        AssuranceResult<SnapshotLawA, SpecLawA> extends AssuranceResult<SnapshotLawA, SpecLawB>
          ? true
          : false,
        AssuranceResult<SnapshotLawA, SpecLawA> extends AssuranceResult<SnapshotLawA, SpecLawA>
          ? true
          : false,
        AssuranceResult<SnapshotLawA> extends AssuranceResult<SnapshotLawA, SpecLawA> ? true : false,
        Equal<CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'passed'>['spec'], SpecLawA>,
      ],
      [false, true, false, true]
    >
  >
>;

type InformationalSpecLaw = AssuranceRunSpec<
  AssuranceRunSpecId<'law.spec.informational'>,
  readonly [InformationalCheckB]
>;

/**
 * Compile-time law: a run that required nothing cannot qualify a shipment.
 *
 * The escape this closes was reachable with every law green. A specification
 * whose checks are all informational narrows no position in the passing arm —
 * correctly, because the run did not require those answers. So an evaluation
 * that came out `refuted` sat inside a result tagged `passed`, and the release
 * qualification's arm accepted any passing result. A candidate could be
 * qualified, published, and shipped on the strength of a run whose only check
 * failed.
 *
 * `passed` is the run's question and it is the wrong prerequisite for a
 * release, which is not asking whether some invocation got what it asked for
 * but whether anything came out wrong.
 *
 * Line one is the gap made visible: on an all-informational spec the passing
 * arm and the fully-satisfied population are different types. Line two is the
 * refusal that matters — a merely-passing editor result is not release grade.
 * Line three is the lawful direction, so the narrowing did not invert. Line
 * four is the anti-vacuity partner, without which a `never` would satisfy both
 * refusals. Line five is the control: where every check is required, the two
 * coincide, so this law is measuring the informational positions rather than
 * asserting that two differently-spelled types differ.
 */
export type AnInformationalRunCannotQualifyARelease = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, InformationalSpecLaw>, 'passed'>['evaluations'],
          FullySatisfiedEvaluations<InformationalSpecLaw['checks']>
        >,
        CaseOf<AssuranceResult<SnapshotLawA, InformationalSpecLaw>, 'passed'> extends
          ReleaseGradeResult<SnapshotLawA, InformationalSpecLaw>
          ? true
          : false,
        ReleaseGradeResult<SnapshotLawA, InformationalSpecLaw> extends
          CaseOf<AssuranceResult<SnapshotLawA, InformationalSpecLaw>, 'passed'>
          ? true
          : false,
        [ReleaseGradeResult<SnapshotLawA, InformationalSpecLaw>] extends [never] ? true : false,
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'passed'>['evaluations'],
          FullySatisfiedEvaluations<SpecLawA['checks']>
        >,
      ],
      [false, false, true, false, true]
    >
  >
>;

/**
 * The result actually carries the planned population, in both arms.
 *
 * This law exists because the previous three did not do the job they appeared to
 * do. They proved `PlannedEvaluations` and `SatisfiedPlannedEvaluations` behave
 * correctly *as operators*, in isolation — and measured, widening
 * `AssuranceResult.passed.evaluations` back to `readonly GateEvaluation[]`
 * compiled clean with all three still green. An operator proved away from its
 * consumer is the same defect as a value proved away from its carrier, and this
 * repository has now committed that twice in two days.
 *
 * So the expected tuples are written out concretely and pinned against the arms
 * themselves. Lines two and four are the widenings that were possible: an
 * unbounded array of evaluations in either arm, which is "something ran" wearing
 * the shape of "what was requested ran".
 */
export type TheResultCarriesThePlannedPopulation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'passed'>['evaluations'],
          readonly [SatisfiedEvaluation<GateLawA, RevisionLawOne>]
        >,
        readonly GateEvaluation[] extends CaseOf<
          AssuranceResult<SnapshotLawA, SpecLawA>,
          'passed'
        >['evaluations']
          ? true
          : false,
        Equal<
          CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'blocked'>['evaluations'],
          readonly [UnsatisfiedEvaluation<GateLawA, RevisionLawOne>]
        >,
        readonly GateEvaluation[] extends CaseOf<
          AssuranceResult<SnapshotLawA, SpecLawA>,
          'blocked'
        >['evaluations']
          ? true
          : false,
        'unsatisfied' extends keyof CaseOf<AssuranceResult<SnapshotLawA, SpecLawA>, 'blocked'>
          ? true
          : false,
      ],
      [true, false, true, false, false]
    >
  >
>;

/**
 * Only a required check can block a run.
 *
 * The blocked arm used to carry two populations: `evaluations`, derived
 * positionally from the specification, and `unsatisfied`, a free
 * `NonEmptyTuple<UnsatisfiedEvaluation>` with nothing relating it to the first.
 * A result could therefore report that every required planned check was
 * satisfied, name one unplanned gate as unsatisfied, and be tagged blocked. It
 * could block on an informational check, on the same foreign gate repeated, or
 * on a gate absent from the specification — the positional population saying
 * what ran, and a curated roster beside it deciding what that meant.
 *
 * That is the pattern the specification work existed to delete, surviving one
 * member to the left of where it was deleted. There is now one population, and
 * these are its refusals.
 *
 * Line four is the one that could not be written at all before: an exact
 * specification with no required check has an *uninhabitable* blocked arm.
 * Informational positions contribute `never` to the union and drop out, so a
 * diagnostic run cannot report itself blocked no matter what it observed.
 */
export type OnlyARequiredCheckCanBlockARun = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          BlockedPlannedEvaluations<readonly [RequiredCheckA]>,
          readonly [UnsatisfiedEvaluation<GateLawA, RevisionLawOne>]
        >,
        readonly [
          UnsatisfiedEvaluation<GateLawA, RevisionLawOne>,
          GateEvaluation<GateLawB, RevisionLawTwo>,
        ] extends BlockedPlannedEvaluations<readonly [RequiredCheckA, RequiredCheckB]>
          ? true
          : false,
        readonly [
          GateEvaluation<GateLawA, RevisionLawOne>,
          UnsatisfiedEvaluation<GateLawB, RevisionLawTwo>,
        ] extends BlockedPlannedEvaluations<readonly [RequiredCheckA, RequiredCheckB]>
          ? true
          : false,
        [BlockedPlannedEvaluations<readonly [InformationalCheckB]>] extends [never] ? true : false,
        Equal<
          BlockedPlannedEvaluations<readonly [RequiredCheckA, InformationalCheckB]>,
          readonly [
            UnsatisfiedEvaluation<GateLawA, RevisionLawOne>,
            GateEvaluation<GateLawB, RevisionLawTwo>,
          ]
        >,
        readonly [SatisfiedEvaluation<GateLawA, RevisionLawOne>] extends BlockedPlannedEvaluations<
          readonly [RequiredCheckA]
        >
          ? true
          : false,
        readonly [UnsatisfiedEvaluation<GateLawB, RevisionLawTwo>] extends BlockedPlannedEvaluations<
          readonly [RequiredCheckA]
        >
          ? true
          : false,
        NonEmptyTuple<UnsatisfiedEvaluation> extends BlockedPlannedEvaluations<
          readonly [RequiredCheckA]
        >
          ? true
          : false,
      ],
      [true, true, true, true, true, false, false, false]
    >
  >
>;

/**
 * Gauntlet acquires nothing.
 *
 * A run carries no surface, no graph, no probe, and no interpreter. If any of
 * these appears the split has collapsed and the heaviest dependency in the
 * repository has followed evaluation everywhere it goes.
 */
export type AnAssuranceResultAcquiresNothing = Assert<
  Equal<
    [
      'surfaces' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'graph' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'probes' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'interpreter' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
      'files' extends keyof CaseOf<AssuranceResult, 'passed'> ? true : false,
    ],
    [false, false, false, false, false]
  >
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

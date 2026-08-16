/**
 * Compile-time laws for `system/01_assurance/01_gauntlet`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, Refine, TagOf } from '../../../types.js';
import type { WorkspaceSnapshotId } from '../../00_workspace/types.js';
import type { AssuranceRunSpec, AssuranceRunSpecId, DemonstratedClaimProofs, DemonstratedGate, FailureClassId, FailureClassReference, Finding, GateDefinition, GateId, GateOutcome, GateRevisionId, PlannedCheck } from '../types.js';
import type { AssuranceResult, BlockedPlannedEvaluations, FullySatisfiedEvaluations, GateEvaluation, PlannedEvaluations, ReleaseGradeResult, SatisfiedEvaluation, SatisfiedPlannedEvaluations, UnsatisfiedEvaluation } from './types.js';

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

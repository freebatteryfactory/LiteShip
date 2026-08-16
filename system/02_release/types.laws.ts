/**
 * Compile-time laws for `system/02_release`.
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

import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, OutputOf, TagOf, TypeAbiAddress } from '../../types.js';
import type { WorkspaceObservation, WorkspaceSnapshotId } from '../00_workspace/types.js';
import type { AssuranceResult, ReleaseGradeResult } from '../01_assurance/01_gauntlet/types.js';
import type { AssuranceRunSpec, AssuranceRunSpecId } from '../01_assurance/types.js';
import type { CompatibilityClaim, PackageReceipt, PublicationPlan, PublicationReceipt, QualifiedReleaseCandidate, ReleaseCandidate, ReleaseCandidateId, ReleasePlan, ReleaseQualification, ReleaseReceipt } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * A release cannot qualify itself.
 *
 * Line one pins the exact arm. Line two is the mutation guard: widening the
 * member to the full algebra readmits `blocked`, and only a negative assertion
 * catches an edit that otherwise looks like a simplification.
 *
 * Line three used to assert that the result carried an `authority` member, on
 * the theory that the chain to a demonstrated detection could otherwise be cut
 * at the far end. That member is gone, and its absence is now the assertion. It
 * carried the snapshot the result already carried and a gate population that had
 * demonstrated something — a badge describing evidence, standing beside the
 * evidence. The chain it was guarding is now carried by the passed arm itself:
 * every required position holds a demonstrated gate, which is where a
 * publication traces back to a demonstration.
 */
export type AReleaseCannotQualifyItself = Assert<
  Equal<
    [
      Equal<CaseOf<ReleaseQualification, 'qualified'>['result'], ReleaseGradeResult>,
      Equal<CaseOf<ReleaseQualification, 'qualified'>['result'], CaseOf<AssuranceResult, 'passed'>>,
      CaseOf<ReleaseQualification, 'qualified'>['result'] extends CaseOf<AssuranceResult, 'passed'>
        ? true
        : false,
      AssuranceResult extends CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'authority' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'snapshot' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'evaluations' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      Equal<TagOf<ReleaseQualification>, 'unqualified' | 'qualified'>,
    ],
    [true, false, true, false, false, true, true, true]
  >
>;


type SnapshotLawA = WorkspaceSnapshotId<'law.snapshot.a'>;

type SnapshotLawB = WorkspaceSnapshotId<'law.snapshot.b'>;

type CandidateLawA = ReleaseCandidateId<'law.candidate.a'>;


/**
 * The coordinate as the public producer actually emits it.
 *
 * Read from `WorkspaceObservation`'s output slot rather than written down as
 * `WorkspaceSnapshotReference<SnapshotLawA>`, which is the difference between
 * a chain law and five local ones. Writing the expected type by hand proves
 * that the stages agree with *the author*; reading it from the operation proves
 * they agree with the producer, so a producer that broadens breaks every stage
 * below it here rather than silently handing out a wider carrier.
 */
type ObservedCoordinateA = OutputOf<WorkspaceObservation<SnapshotLawA>>['id'];


/**
 * One coordinate travels from the observation to the publication receipt.
 *
 * Six stages, each reading the previous stage's product, all pinned against the
 * type the producer emits. This is the connected use the home was missing: the
 * previous arrangement proved exactness at individual links, and links that each
 * hold locally are exactly how a chain leaks — which is the defect the coordinate
 * repair one commit ago was itself repairing, one layer up.
 */
export type TheReleaseChainCarriesOneCoordinateEndToEnd = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<ObservedCoordinateA, ReleasePlan<SnapshotLawA>['snapshot']>,
        Equal<PackageReceipt<SnapshotLawA>['plan']['snapshot'], ObservedCoordinateA>,
        Equal<ReleaseCandidate<CandidateLawA, SnapshotLawA>['packaged']['plan']['snapshot'], ObservedCoordinateA>,
        Equal<
          CaseOf<ReleaseQualification<SnapshotLawA>, 'qualified'>['result']['snapshot'],
          ObservedCoordinateA
        >,
        Equal<ReleaseReceipt<CandidateLawA, SnapshotLawA>['candidate']['snapshot'], ObservedCoordinateA>,
        Equal<
          PublicationReceipt<CandidateLawA, SnapshotLawA>['plan']['released']['candidate']['snapshot'],
          ObservedCoordinateA
        >,
      ],
      [true, true, true, true, true, true]
    >
  >
>;


/**
 * No stage in that chain admits a product from another coordinate.
 *
 * The positive law above would be satisfied by a chain in which every stage
 * carried the broad reference, because the broad reference equals itself. These
 * are the refusals, one per joint, and the last line is the lawful control: the
 * matching coordinate must still be accepted, or the chain would be proved
 * airtight by being unbuildable.
 */
export type NoStageInTheChainAdmitsAnotherCoordinate = Assert<
  IsExactlyTrue<
    Equal<
      [
        ReleasePlan<SnapshotLawB> extends ReleasePlan<SnapshotLawA> ? true : false,
        PackageReceipt<SnapshotLawB> extends ReleaseCandidate<
          CandidateLawA,
          SnapshotLawA
        >['packaged']
          ? true
          : false,
        ReleaseQualification<SnapshotLawB> extends ReleaseCandidate<
          CandidateLawA,
          SnapshotLawA
        >['qualification']
          ? true
          : false,
        QualifiedReleaseCandidate<CandidateLawA, SnapshotLawB> extends ReleaseReceipt<
          CandidateLawA,
          SnapshotLawA
        >['candidate']
          ? true
          : false,
        ReleaseReceipt<CandidateLawA, SnapshotLawB> extends PublicationPlan<
          CandidateLawA,
          SnapshotLawA
        >['released']
          ? true
          : false,
        QualifiedReleaseCandidate<CandidateLawA, SnapshotLawA> extends ReleaseReceipt<
          CandidateLawA,
          SnapshotLawA
        >['candidate']
          ? true
          : false,
      ],
      [false, false, false, false, false, true]
    >
  >
>;


type SpecLawA = AssuranceRunSpec<AssuranceRunSpecId<'law.spec.a'>>;

type SpecLawB = AssuranceRunSpec<AssuranceRunSpecId<'law.spec.b'>>;


/**
 * No stage admits a result from another specification either.
 *
 * The snapshot axis answers "was this evidence about the right revision". This
 * one answers "was it about the right question". A passing result means every
 * check the run *required* was satisfied — so a run that required nothing also
 * passes, and an editor invocation's result would otherwise be assignable
 * wherever a release-grade one is, carrying an honest `passed` tag the whole way
 * to a published artifact.
 *
 * Line four is the one that would be missed. The broad specification is not the
 * union of all specifications; it is the case where nobody has said which run
 * this was, and it must not satisfy a carrier that named one. Line five is the
 * lawful control.
 */
export type NoStageInTheChainAdmitsAnotherSpecification = Assert<
  IsExactlyTrue<
    Equal<
      [
        ReleaseQualification<SnapshotLawA, SpecLawB> extends ReleaseCandidate<
          CandidateLawA,
          SnapshotLawA,
          SpecLawA
        >['qualification']
          ? true
          : false,
        QualifiedReleaseCandidate<CandidateLawA, SnapshotLawA, SpecLawB> extends ReleaseReceipt<
          CandidateLawA,
          SnapshotLawA,
          SpecLawA
        >['candidate']
          ? true
          : false,
        ReleaseReceipt<CandidateLawA, SnapshotLawA, SpecLawB> extends PublicationPlan<
          CandidateLawA,
          SnapshotLawA,
          SpecLawA
        >['released']
          ? true
          : false,
        ReleaseQualification<SnapshotLawA> extends ReleaseCandidate<
          CandidateLawA,
          SnapshotLawA,
          SpecLawA
        >['qualification']
          ? true
          : false,
        ReleaseQualification<SnapshotLawA, SpecLawA> extends ReleaseCandidate<
          CandidateLawA,
          SnapshotLawA,
          SpecLawA
        >['qualification']
          ? true
          : false,
      ],
      [false, false, false, false, true]
    >
  >
>;


/**
 * A release receipt requires a candidate that was actually qualified.
 *
 * Line one is the repair: a plain candidate, whose qualification may be sitting
 * in the `unqualified` arm, is not a thing that can have been released. Line two
 * keeps the refinement honest in the other direction — a qualified candidate is
 * still a candidate, so nothing downstream has to special-case it. Line three
 * pins the narrowed member.
 *
 * Line four is the one that is not decoration. `Refine` resolves to `never` when
 * a change is not a strict narrowing, and `never` is assignable to everything —
 * so a `QualifiedReleaseCandidate` that had quietly become `never` would satisfy
 * lines one through three and every other assertion ever written about it. This
 * repository has shipped that composition before.
 */
export type AReleaseReceiptRequiresAQualifiedCandidate = Assert<
  IsExactlyTrue<
    Equal<
      [
        ReleaseCandidate<CandidateLawA, SnapshotLawA> extends ReleaseReceipt<
          CandidateLawA,
          SnapshotLawA
        >['candidate']
          ? true
          : false,
        QualifiedReleaseCandidate<CandidateLawA, SnapshotLawA> extends ReleaseCandidate<
          CandidateLawA,
          SnapshotLawA
        >
          ? true
          : false,
        Equal<
          QualifiedReleaseCandidate<CandidateLawA, SnapshotLawA>['qualification'],
          CaseOf<ReleaseQualification<SnapshotLawA>, 'qualified'>
        >,
        [QualifiedReleaseCandidate<CandidateLawA, SnapshotLawA>] extends [never] ? true : false,
      ],
      [false, true, true, false]
    >
  >
>;


/**
 * A compatibility claim can state that no predecessor exists.
 *
 * This is a conclusion over the current ABI rather than a reason-shaped
 * assessment state. The roster, current address, absent predecessor, and
 * absent free-text reason are all pinned at the public carrier.
 */
export type ACompatibilityClaimNamesNoPredecessorExactly = Assert<
  IsExactlyTrue<
    Equal<
      [
        'no-predecessor' extends TagOf<CompatibilityClaim> ? true : false,
        Equal<
          TagOf<CompatibilityClaim>,
          'no-predecessor' | 'unchanged' | 'compatible' | 'breaking'
        >,
        'previous' extends keyof CaseOf<CompatibilityClaim, 'no-predecessor'> ? true : false,
        'reason' extends keyof CaseOf<CompatibilityClaim, 'no-predecessor'> ? true : false,
        Equal<CaseOf<CompatibilityClaim, 'no-predecessor'>['current'], TypeAbiAddress>,
        Equal<CaseOf<CompatibilityClaim, 'breaking'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      ],
      [true, true, false, false, true, true]
    >
  >
>;


/**
 * The three receipts are three populations.
 *
 * Envelopes differ by tag, so the assertions are about substitutability: no
 * receipt may stand in for another, and a package receipt carries no
 * destination because packaging publishes nothing.
 */
export type ReleaseReceiptsCarryTheirPhase = Assert<
  Equal<
    [
      PackageReceipt extends ReleaseReceipt ? true : false,
      ReleaseReceipt extends PublicationReceipt ? true : false,
      PublicationReceipt extends PackageReceipt ? true : false,
      'published' extends keyof PackageReceipt ? true : false,
      'destinations' extends keyof PackageReceipt ? true : false,
    ],
    [false, false, false, false, false]
  >
>;


/**
 * A candidate is exact over both of its axes.
 *
 * The third line is the anti-vacuity partner that catches the carrier dropping
 * the parameter, which is this repository's signature defect and has now been
 * committed four separate times. The last line carries the snapshot axis, which
 * the chain law proves at the joints and this one proves at the type.
 */
export type AReleaseCandidateIsExactOverItsIdentity = Assert<
  Equal<
    [
      ReleaseCandidate<ReleaseCandidateId<'a'>> extends ReleaseCandidate<ReleaseCandidateId<'b'>>
        ? true
        : false,
      ReleaseCandidate<ReleaseCandidateId<'a'>> extends ReleaseCandidate<ReleaseCandidateId<'a'>>
        ? true
        : false,
      ReleaseCandidate extends ReleaseCandidate<ReleaseCandidateId<'a'>> ? true : false,
      ReleaseReceipt<ReleaseCandidateId<'a'>> extends ReleaseReceipt<ReleaseCandidateId<'b'>>
        ? true
        : false,
      ReleaseCandidate<CandidateLawA, SnapshotLawA> extends ReleaseCandidate<
        CandidateLawA,
        SnapshotLawB
      >
        ? true
        : false,
    ],
    [false, true, false, false, false]
  >
>;

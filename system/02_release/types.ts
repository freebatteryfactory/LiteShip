/**
 * Release: distributable meaning and the authority a shipment must consume.
 *
 * This home owns what a release *is* — a candidate, its packed artifacts, its
 * compatibility claim, its qualification, and the receipts for packaging,
 * releasing, and publishing. It owns no command parsing, no registry protocol,
 * and no credentials. Those are a wire and a host respectively.
 *
 * The relation this file exists to make structural is short:
 *
 * > A release candidate cannot qualify itself.
 *
 * `ReleaseQualification`'s qualified arm carries the *passed* arm of
 * `AssuranceResult`, not the whole algebra, so a candidate that produced a
 * tarball and felt optimistic has nowhere to put that optimism.
 *
 * The second relation is newer and is what the chain laws at the bottom of this
 * file exist for:
 *
 * > Every stage consumes the previous stage's product, not a name for it.
 *
 * A plan names a snapshot; a package receipt carries the plan; a candidate
 * carries the receipt; a release receipt carries a *qualified* candidate; a
 * publication plan carries the release receipt; a withdrawal carries the
 * publication receipt. One coordinate threads all of it, and it is read from
 * `WorkspaceObservation`'s output rather than restated here, so a producer that
 * broadens breaks every stage below it.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Envelope,
  IsExactlyTrue,
  NonEmptyTuple,
  OutputOf,
  Reference,
  Refine,
  TagOf,
  TypeAbiAddress,
  TypeAbiAttestation,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ContentAddress, ContentDigest, MediaType } from '../../00_core/01_encoding/types.js';
import type {
  WorkspaceObservation,
  WorkspaceSnapshotId,
  WorkspaceSnapshotReference,
} from '../00_workspace/types.js';
import type { AssuranceRunSpec, AssuranceRunSpecId } from '../01_assurance/types.js';
import type { AssuranceResult } from '../01_assurance/01_gauntlet/types.js';

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

export type PackageId<Name extends string = string> = Brand<Name, 'liteship.package-id'>;
export type PackageReference<Id extends PackageId = PackageId> = Reference<'package', Id>;

/**
 * One packed distributable.
 *
 * `contents` is the addressed population the package contains, so what was
 * shipped is enumerable after the fact rather than inferable from a tarball
 * nobody kept. It is non-empty because an empty distributable is not a
 * distributable, and a law over an empty population proves nothing.
 */
export interface PackedArtifact<Id extends PackageId = PackageId> {
  readonly package: PackageReference<Id>;
  readonly address: ContentAddress;
  readonly digest: ContentDigest;
  readonly mediaType: MediaType;
  readonly contents: NonEmptyTuple<ContentAddress>;
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

/**
 * What this release claims about type compatibility with its predecessor.
 *
 * Over `TypeAbiAddress`, which root owns and audit produces, rather than over
 * a version string. A semantic version is an assertion a human typed; an ABI
 * address is a fact about the surface, and the difference is the whole reason
 * the Type ABI exists.
 *
 * The `unknown` arm is required and is not a failure. A release with no
 * predecessor surface to compare against genuinely does not know, and a
 * grammar that forces it to say `compatible` teaches the whole apparatus to
 * lie exactly once per first release.
 */
export type CompatibilityClaim = Algebra<{
  unknown: { readonly reason: string };
  unchanged: { readonly previous: TypeAbiAddress; readonly current: TypeAbiAddress };
  compatible: { readonly previous: TypeAbiAddress; readonly current: TypeAbiAddress };
  breaking: {
    readonly previous: TypeAbiAddress;
    readonly current: TypeAbiAddress;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

// ---------------------------------------------------------------------------
// The chain: plan, package, candidate, qualification
//
// Ordered causally rather than by kind. Each stage consumes the previous
// stage's product, not a name for it, so ancestry is read off the type instead
// of being asserted beside it.
// ---------------------------------------------------------------------------

/** What packaging intends to produce, before it has produced it. */
export interface ReleasePlan<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> {
  readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
  readonly packages: NonEmptyTuple<PackageReference>;
}

/**
 * What packaging produced, and the plan it produced it from.
 *
 * The plan is carried rather than referenced because the snapshot coordinate
 * lives on it. A receipt holding a bare artifact population would be a product
 * with no ancestry, which is the shape a candidate used to hold.
 */
export type PackageReceipt<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = Envelope<
  'LiteShipPackageReceipt',
  1,
  {
    readonly plan: ReleasePlan<Snapshot>;
    readonly produced: NonEmptyTuple<PackedArtifact>;
    readonly address: ContentAddress<'application/vnd.liteship.package-receipt+cbor'>;
  }
>;

export type ReleaseCandidateId<Name extends string = string> = Brand<
  Name,
  'liteship.release-candidate-id'
>;
export type ReleaseCandidateReference<Id extends ReleaseCandidateId = ReleaseCandidateId> =
  Reference<'release-candidate', Id>;

/**
 * Whether a candidate is allowed to ship.
 *
 * The qualified arm carries `CaseOf<AssuranceResult, 'passed'>` — the passed
 * arm specifically, never the full algebra. Widening it to `AssuranceResult`
 * would readmit `blocked` and restore self-qualification, which is why a law
 * below pins the exact arm rather than merely pinning that some result is
 * present.
 *
 * One member, not two. A qualification used to carry an authority and a receipt
 * side by side, and their agreement was prose.
 *
 * The specification is exact for the same reason the snapshot is. A passing
 * result says every check the run *required* was satisfied — so a run that
 * required nothing produces a passing result too, and without this axis an
 * editor invocation's result is assignable wherever a release-grade one is.
 * Which specification release requires is a decision the release program makes;
 * what the type prevents is one run's answer being quoted for another's
 * question.
 */
export type ReleaseQualification<
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Algebra<{
  unqualified: { readonly reason: string; readonly diagnostics: readonly Diagnostic[] };
  qualified: { readonly result: CaseOf<AssuranceResult<Snapshot, Spec>, 'passed'> };
}>;

/**
 * One candidate: an exact snapshot, what was packed from it, and what the
 * surface claims.
 *
 * The snapshot is the same coordinate assurance earned its result over. A
 * candidate built from one revision and qualified against another is the
 * failure this member exists to make visible, and it is why the working-tree
 * state lives on the snapshot rather than being asked for again here.
 *
 * `packaged` carries the packaging receipt, not a bare artifact population.
 * That is a repair rather than a refinement: `packages: NonEmptyTuple<
 * PackedArtifact>` let a candidate for snapshot A hold artifacts produced under
 * a plan for snapshot B, because an artifact carries an address and a digest and
 * no ancestry at all. The receipt carries its plan and the plan carries the
 * coordinate, so the artifacts a candidate ships are now typed as the ones
 * packaged from its own snapshot.
 *
 * `snapshot` remains beside it and is not a second fact. Both read the same
 * parameter, so `packaged.plan.snapshot` and `snapshot` are the same type by
 * construction and cannot be made to disagree; the member is the direct way to
 * name the coordinate everyone downstream threads.
 */
export interface ReleaseCandidate<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> {
  readonly candidate: ReleaseCandidateReference<Id>;
  readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
  readonly packaged: PackageReceipt<Snapshot>;
  readonly attestations: readonly TypeAbiAttestation[];
  readonly compatibility: CompatibilityClaim;
  readonly qualification: ReleaseQualification<Snapshot, Spec>;
}

/**
 * A candidate whose qualification is in the qualified arm.
 *
 * Built with root's `Refine`, which rejects a change that is not a strict
 * narrowing — so this cannot silently become an alias for the candidate it
 * claims to constrain, and a law below pins that it did not resolve to `never`
 * (a `never` candidate would satisfy every assertion written about it).
 *
 * This exists because `ReleaseCandidate` must be able to be unqualified: a
 * candidate is packed before it is judged, and a grammar with no unqualified
 * state forces packaging to lie. What must not be representable is a *release*
 * of one, which is what the receipt below consumes.
 */
export type QualifiedReleaseCandidate<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Refine<
  ReleaseCandidate<Id, Snapshot, Spec>,
  { readonly qualification: CaseOf<ReleaseQualification<Snapshot, Spec>, 'qualified'> }
>;

// ---------------------------------------------------------------------------
// The chain continued: release, publication, withdrawal
// ---------------------------------------------------------------------------

/** Where one package is intended to go. */
export interface PublicationDestination {
  readonly registry: string;
  readonly package: PackageReference;
  readonly tag: string;
}

/**
 * Three receipts, because packaging, releasing, and publishing are three
 * operations over one authority and each can succeed while the next does not.
 *
 * The repository already learned this shape in `02_targets`: every product
 * carries the identity of the phase it belongs to, so nothing changes phase by
 * swapping which reference it holds. A package receipt names no destination
 * because packaging reaches no registry; a publication receipt names one
 * because it did.
 *
 * A release receipt takes a *qualified* candidate. Previously it took
 * `ReleaseCandidate<Id>`, whose `qualification` member could be sitting in the
 * `unqualified` arm — so the type that exists to record that something shipped
 * could record the shipping of something the apparatus had refused. The
 * qualification law two sections down was true and was being applied one stage
 * too early.
 */
export type ReleaseReceipt<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Envelope<
  'LiteShipReleaseReceipt',
  1,
  {
    readonly candidate: QualifiedReleaseCandidate<Id, Snapshot, Spec>;
    readonly address: ContentAddress<'application/vnd.liteship.release-receipt+cbor'>;
  }
>;

/**
 * What publication intends to send, and where.
 *
 * The released receipt is carried rather than a candidate reference. A
 * reference names a candidate; the receipt is evidence that the candidate was
 * released, and publishing something that was never released is the same defect
 * one stage further down the chain. The candidate reference is still reachable
 * through it, so nothing was lost by not writing it twice.
 */
export interface PublicationPlan<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> {
  readonly released: ReleaseReceipt<Id, Snapshot, Spec>;
  readonly destinations: NonEmptyTuple<PublicationDestination>;
}

/**
 * What publication actually sent.
 *
 * `published` is a separate population from the plan's `destinations` and is
 * not a duplicate of it: a publication that reached two registries out of three
 * is a real outcome, and a grammar in which intent and result are the same
 * member cannot say so.
 */
export type PublicationReceipt<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> = Envelope<
  'LiteShipPublicationReceipt',
  1,
  {
    readonly plan: PublicationPlan<Id, Snapshot, Spec>;
    readonly published: NonEmptyTuple<PublicationDestination>;
    readonly address: ContentAddress<'application/vnd.liteship.publication-receipt+cbor'>;
  }
>;

/**
 * A published release taken back.
 *
 * Present because publication is the one system operation that is not
 * reversible by re-running it, and a vocabulary with no way to say "this went
 * out and should not have" forces the retraction into prose.
 *
 * It carries the publication receipt for the same reason every other stage
 * carries its predecessor: withdrawing something that was never published was
 * representable, and `destinations` is the subset being taken back, which may
 * be smaller than the set that went out.
 */
export interface Withdrawal<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
  Spec extends AssuranceRunSpec = AssuranceRunSpec,
> {
  readonly published: PublicationReceipt<Id, Snapshot, Spec>;
  readonly destinations: NonEmptyTuple<PublicationDestination>;
  readonly reason: string;
  readonly diagnostics: readonly Diagnostic[];
}

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
      Equal<CaseOf<ReleaseQualification, 'qualified'>['result'], CaseOf<AssuranceResult, 'passed'>>,
      AssuranceResult extends CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'authority' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'snapshot' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'evaluations' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      Equal<TagOf<ReleaseQualification>, 'unqualified' | 'qualified'>,
    ],
    [true, false, false, true, true, true]
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
 * A compatibility claim may say it does not know.
 *
 * The `unknown` arm is checked as present, and the count is pinned so a later
 * edit cannot delete it as apparent dead weight. A grammar without it forces
 * a first release to assert compatibility with a predecessor that does not
 * exist.
 */
export type ACompatibilityClaimMayBeUnknown = Assert<
  Equal<
    [
      'unknown' extends TagOf<CompatibilityClaim> ? true : false,
      Equal<TagOf<CompatibilityClaim>, 'unknown' | 'unchanged' | 'compatible' | 'breaking'>,
      'previous' extends keyof CaseOf<CompatibilityClaim, 'unknown'> ? true : false,
      Equal<CaseOf<CompatibilityClaim, 'breaking'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true, false, true]
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

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the root system topology. */
export interface ReleaseTypeSurface {
  readonly package: PackedArtifact;
  readonly compatibility: CompatibilityClaim;
  readonly candidate: ReleaseCandidate;
  readonly qualifiedCandidate: QualifiedReleaseCandidate;
  readonly qualification: ReleaseQualification;
  readonly releasePlan: ReleasePlan;
  readonly publicationPlan: PublicationPlan;
  readonly packageReceipt: PackageReceipt;
  readonly releaseReceipt: ReleaseReceipt;
  readonly publicationReceipt: PublicationReceipt;
  readonly withdrawal: Withdrawal;
}

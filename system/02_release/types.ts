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
  Brand,
  CaseOf,
  Envelope,
  NonEmptyTuple,
  Reference,
  Refine,
  TypeAbiAddress,
  TypeAbiAttestation,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ContentAddress, ContentDigest, MediaType } from '../../00_core/01_encoding/types.js';
import type {
  WorkspaceSnapshotId,
  WorkspaceSnapshotReference,
} from '../00_workspace/types.js';
import type {
  AssuranceRunSpec,
} from '../01_assurance/types.js';
import type {
  ReleaseGradeResult,
} from '../01_assurance/01_gauntlet/types.js';

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

/** Stable identity for one package. */
export type PackageId<Name extends string = string> = Brand<Name, 'liteship.package-id'>;
/** Typed reference to one package. */
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
 * The `no-predecessor` arm is a compatibility conclusion, not an assessment
 * state: the current surface is known and no previous surface exists. It keeps
 * that first release from lying about a comparison that never occurred.
 */
export type CompatibilityClaim = Algebra<{
  'no-predecessor': { readonly current: TypeAbiAddress };
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
 * lives on it. A receipt holding only artifacts would be a product with no
 * ancestry.
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

/** Stable identity for one release candidate. */
export type ReleaseCandidateId<Name extends string = string> = Brand<
  Name,
  'liteship.release-candidate-id'
>;
/** Typed reference to one release candidate. */
export type ReleaseCandidateReference<Id extends ReleaseCandidateId = ReleaseCandidateId> =
  Reference<'release-candidate', Id>;

/**
 * Whether a candidate is allowed to ship.
 *
 * The qualified arm carries `ReleaseGradeResult` — a strict narrowing of the
 * passed arm, never the full algebra. Widening it to `AssuranceResult` would
 * readmit `blocked` and restore self-qualification, which is why a law below
 * pins the exact type rather than merely pinning that some result is present.
 *
 * It carried the passed arm itself until an escape was found underneath it.
 * `passed` means *what this run required was satisfied*, so a specification
 * whose checks are all informational narrows no position and a refuted
 * evaluation rides inside a passing result. That result then qualified a
 * candidate, and a shipment went out on a run whose only check failed, with
 * every law green. `ReleaseGradeResult` holds every planned position to the
 * satisfied outcome regardless of consequence, which is the release's question
 * rather than the run's.
 *
 * The qualification carries one release-grade result. A separate authority and
 * receipt would repeat the same decision with only prose relating them.
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
  qualified: { readonly result: ReleaseGradeResult<Snapshot, Spec> };
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

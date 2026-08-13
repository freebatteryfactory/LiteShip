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
 * `ReleaseQualification`'s qualified arm carries the *earned* arm of
 * `AssuranceAuthority`, not the whole algebra, so a candidate that produced a
 * tarball and felt optimistic has nowhere to put that optimism. Earned
 * authority in turn carries the snapshot it was earned over and the qualified
 * gates that earned it, so the chain from a published artifact back to a
 * demonstrated detection is unbroken and typed at every link.
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
  NonEmptyTuple,
  Reference,
  TagOf,
  TypeAbiAddress,
  TypeAbiAttestation,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ContentAddress, ContentDigest, MediaType } from '../../00_core/01_encoding/types.js';
import type { WorkspaceSnapshotId, WorkspaceSnapshotReference } from '../00_workspace/types.js';
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
// Candidates and qualification
// ---------------------------------------------------------------------------

export type ReleaseCandidateId<Name extends string = string> = Brand<
  Name,
  'liteship.release-candidate-id'
>;
export type ReleaseCandidateReference<Id extends ReleaseCandidateId = ReleaseCandidateId> =
  Reference<'release-candidate', Id>;

/**
 * Whether a candidate is allowed to ship.
 *
 * The qualified arm carries `CaseOf<AssuranceAuthority, 'earned'>` — the earned
 * arm specifically, never the full algebra. Widening it to `AssuranceAuthority`
 * would readmit `unearned` and restore self-qualification, which is why a law
 * below pins the exact arm rather than merely pinning that some authority is
 * present.
 *
 * The receipt travels beside the authority so a qualification names the run it
 * came from and is auditable after the fact.
 */
export type ReleaseQualification<Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId> = Algebra<{
  unqualified: { readonly reason: string; readonly diagnostics: readonly Diagnostic[] };
  qualified: { readonly result: CaseOf<AssuranceResult<Snapshot>, 'passed'> };
}>;

/**
 * One candidate: an exact snapshot, what was packed from it, and what the
 * surface claims.
 *
 * The snapshot is the same coordinate assurance earned its authority over. A
 * candidate built from one revision and qualified against another is the
 * failure this member exists to make visible, and it is why the working-tree
 * state lives on the snapshot rather than being asked for again here.
 */
export interface ReleaseCandidate<
  Id extends ReleaseCandidateId = ReleaseCandidateId,
  Snapshot extends WorkspaceSnapshotId = WorkspaceSnapshotId,
> {
  readonly candidate: ReleaseCandidateReference<Id>;
  readonly snapshot: WorkspaceSnapshotReference<Snapshot>;
  readonly packages: NonEmptyTuple<PackedArtifact>;
  readonly attestations: readonly TypeAbiAttestation[];
  readonly compatibility: CompatibilityClaim;
  readonly qualification: ReleaseQualification<Snapshot>;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/** Where one package is intended to go. */
export interface PublicationDestination {
  readonly registry: string;
  readonly package: PackageReference;
  readonly tag: string;
}

/** What packaging intends to produce, before it has produced it. */
export interface ReleasePlan {
  readonly snapshot: WorkspaceSnapshotReference;
  readonly packages: NonEmptyTuple<PackageReference>;
}

/** What publication intends to send, and where. */
export interface PublicationPlan<Id extends ReleaseCandidateId = ReleaseCandidateId> {
  readonly candidate: ReleaseCandidateReference<Id>;
  readonly destinations: NonEmptyTuple<PublicationDestination>;
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

/**
 * Three receipts, because packaging, releasing, and publishing are three
 * operations over one authority and each can succeed while the next does not.
 *
 * The repository already learned this shape in `02_targets`: every product
 * carries the identity of the phase it belongs to, so nothing changes phase by
 * swapping which reference it holds. A package receipt names no destination
 * because packaging reaches no registry; a publication receipt names one
 * because it did.
 */
export type PackageReceipt = Envelope<
  'LiteShipPackageReceipt',
  1,
  {
    readonly plan: ReleasePlan;
    readonly produced: NonEmptyTuple<PackedArtifact>;
    readonly address: ContentAddress<'application/vnd.liteship.package-receipt+cbor'>;
  }
>;

export type ReleaseReceipt<Id extends ReleaseCandidateId = ReleaseCandidateId> = Envelope<
  'LiteShipReleaseReceipt',
  1,
  {
    readonly candidate: ReleaseCandidate<Id>;
    readonly address: ContentAddress<'application/vnd.liteship.release-receipt+cbor'>;
  }
>;

export type PublicationReceipt<Id extends ReleaseCandidateId = ReleaseCandidateId> = Envelope<
  'LiteShipPublicationReceipt',
  1,
  {
    readonly candidate: ReleaseCandidateReference<Id>;
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
 */
export interface Withdrawal<Id extends ReleaseCandidateId = ReleaseCandidateId> {
  readonly candidate: ReleaseCandidateReference<Id>;
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
 * member to the full algebra readmits `unearned`, and only a negative
 * assertion catches an edit that otherwise looks like a simplification.
 * Line three confirms the earned arm still carries its gates, so the chain to a
 * demonstrated detection cannot be cut at the far end instead.
 */
export type AReleaseCannotQualifyItself = Assert<
  Equal<
    [
      Equal<CaseOf<ReleaseQualification, 'qualified'>['result'], CaseOf<AssuranceResult, 'passed'>>,
      AssuranceResult extends CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'authority' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      'snapshot' extends keyof CaseOf<ReleaseQualification, 'qualified'>['result'] ? true : false,
      Equal<TagOf<ReleaseQualification>, 'unqualified' | 'qualified'>,
    ],
    [true, false, true, true, true]
  >
>;

type SnapshotLawA = WorkspaceSnapshotId<'law.snapshot.a'>;
type SnapshotLawB = WorkspaceSnapshotId<'law.snapshot.b'>;

/**
 * A candidate cannot be qualified by a result about a different snapshot.
 *
 * This is the relationship the whole home exists for, and until now it was
 * prose. `WorkspaceSnapshotReference` used to carry only the snapshot media
 * type, which resolves to one template literal identical for every snapshot
 * that will ever exist — so every consumer held the same erased type, two
 * references to different revisions were mutually assignable, and "the
 * candidate and the authority share one coordinate" was unenforceable. The same
 * file admitted as much thirty lines lower, in its proof obligations.
 *
 * One parameter now threads: the candidate's snapshot and its qualification's
 * snapshot are the same `Snapshot`, so a passing result for B cannot qualify a
 * candidate built from A. Line one is the negative that matters. Line two is
 * the lawful control — the correct pairing must still be constructible, or this
 * would be satisfied by a type nobody can build.
 */
export type ACandidateCannotBeQualifiedByAnotherSnapshotsResult = Assert<
  Equal<
    [
      ReleaseQualification<SnapshotLawB> extends ReleaseCandidate<
        ReleaseCandidateId,
        SnapshotLawA
      >['qualification']
        ? true
        : false,
      ReleaseQualification<SnapshotLawA> extends ReleaseCandidate<
        ReleaseCandidateId,
        SnapshotLawA
      >['qualification']
        ? true
        : false,
      ReleaseCandidate<ReleaseCandidateId, SnapshotLawA> extends ReleaseCandidate<
        ReleaseCandidateId,
        SnapshotLawB
      >
        ? true
        : false,
    ],
    [false, true, false]
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
 * A candidate is exact over its identity.
 *
 * The third line is the anti-vacuity partner that catches the carrier dropping
 * the parameter, which is this repository's signature defect and has now been
 * committed four separate times.
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
    ],
    [false, true, false, false]
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
  readonly qualification: ReleaseQualification;
  readonly releasePlan: ReleasePlan;
  readonly publicationPlan: PublicationPlan;
  readonly packageReceipt: PackageReceipt;
  readonly releaseReceipt: ReleaseReceipt;
  readonly publicationReceipt: PublicationReceipt;
  readonly withdrawal: Withdrawal;
}

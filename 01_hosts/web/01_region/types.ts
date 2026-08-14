/**
 * Physical render regions and the one-writer authority.
 *
 * A region is a bounded physical browser egress domain whose nodes and
 * browser-managed state may be observed and mutated atomically by one declared
 * writer for one transaction. It is not a component, a semantic world, a
 * `SemanticLocation`, a CSS selector, or permanent ownership of every
 * descendant: nested regions are carved out of a parent's mutation domain by
 * explicit exclusion, and a foreign region is an opaque boundary no LiteShip
 * writer enters.
 *
 * Semantic addresses reach physical nodes only through the region's
 * revision-pinned projection index. A raw selector is not an address.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Hole,
  NonEmptyTuple,
  Reference,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionReference, SemanticLocation } from '../../../00_core/02_identity/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type {
  GroundingId,
  ProjectionTargetReference,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';

export type WebDocumentId<Name extends string = string> = Brand<Name, 'liteship.web.document-id'>;
export type WebDocumentReference<Id extends WebDocumentId = WebDocumentId> = Reference<'web-document', Id>;
/** Opaque physical node handle. Never a raw DOM interface on the governed surface. */
export type WebNodeId<Name extends string = string> = Brand<Name, 'liteship.web.node-id'>;
export type WebNodeReference<Id extends WebNodeId = WebNodeId> = Reference<'web-node', Id>;
export type RegionId<Name extends string = string> = Brand<Name, 'liteship.web.region-id'>;
export type RegionReference<Id extends RegionId = RegionId> = Reference<'web-region', Id>;
export type RegionWriterId<Name extends string = string> = Brand<Name, 'liteship.web.region-writer-id'>;
export type RegionWriterReference<Id extends RegionWriterId = RegionWriterId> = Reference<
  'web-region-writer',
  Id
>;

/**
 * The bounded mutation domain of one region: a root node inside one document,
 * minus the descendant regions explicitly excluded from this writer's domain.
 * Exclusion is how static output, residual regions, trusted-fragment regions,
 * and opaque foreign islands lawfully coexist without racing.
 */
export interface RegionBoundary {
  readonly document: WebDocumentReference;
  readonly root: WebNodeReference;
  readonly excluded: readonly RegionReference[];
}

/**
 * Who holds a region. `static` output has no live writer; `owned` names the
 * one LiteShip writer; `foreign` is an opaque exclusion boundary that is not a
 * LiteShip writer and carries none.
 */
export type RegionCustody = Algebra<{
  static: Record<never, never>;
  owned: { readonly writer: RegionWriterReference };
  foreign: Record<never, never>;
}>;

/**
 * One membership, one transaction, one committed revision. The lease
 * references its persistent membership — region and writer live there once,
 * with no restated sibling copies to disagree — and authority is never
 * obtained merely by being able to reach a DOM node.
 */
export interface RegionWriteAuthority {
  readonly membership: RegionMembership;
  readonly revision: RevisionReference;
  readonly generation: TransactionGeneration;
}

/** Explicit, revision-pinned custody transitions. There are no implicit ones. */
export type RegionCustodyTransition = Algebra<{
  claim: {
    readonly region: RegionReference;
    readonly writer: RegionWriterReference;
    readonly revision: RevisionReference;
  };
  transfer: {
    readonly region: RegionReference;
    readonly from: RegionWriterReference;
    readonly to: RegionWriterReference;
    readonly revision: RevisionReference;
  };
  release: {
    readonly region: RegionReference;
    readonly writer: RegionWriterReference;
    readonly revision: RevisionReference;
  };
}>;

/**
 * The browser-physical state a commit preserves, where applicable. This is
 * the ledger-anchored population; it is deliberately not an enumeration of
 * every browser state property.
 */
export type PreservedAspect =
  | 'focus'
  | 'selection'
  | 'scroll'
  | 'form-state'
  | 'media-state'
  | 'browser-managed'
  | 'foreign-boundary';

export type RegionPreservationProfile = readonly PreservedAspect[];

/**
 * What a semantic address may be, when resolved against a region. A raw
 * selector is deliberately not a subject: addresses are semantic locations or
 * projection targets, resolved under one exact committed revision.
 */
export type ProjectionSubject = Algebra<{
  location: { readonly location: SemanticLocation };
  target: { readonly target: ProjectionTargetReference };
}>;

/** The revision-pinned bridge from semantic addresses to physical nodes. */
export interface RegionProjectionIndex {
  readonly region: RegionReference;
  readonly revision: RevisionReference;
  readonly entries: readonly {
    readonly subject: ProjectionSubject;
    readonly node: WebNodeReference;
  }[];
  readonly address: ContentAddress<'application/vnd.liteship.web-region-index+cbor'>;
}

// ---------------------------------------------------------------------------
// Capabilities: how region authority actually enters the calculus
// ---------------------------------------------------------------------------

/** A resolve request: one subject, inside one region, at one exact revision. */
export interface RegionResolveRequest {
  readonly region: RegionReference;
  readonly revision: RevisionReference;
  readonly subject: ProjectionSubject;
}

/**
 * Narrow authority to resolve semantic subjects to physical nodes — always
 * inside a named region at an exact revision, through the revision-pinned
 * index. A bare subject producing a node could resolve against the wrong
 * revision or outside the writer's physical domain.
 */
export interface RegionDiscovery {
  readonly locate: Signature<RegionResolveRequest, WebNodeReference, NonEmptyTuple<Diagnostic>>;
}

/** An already-existing mount region whose custody the application transfers. */
export interface MountRegion {
  readonly region: RegionReference;
  readonly boundary: RegionBoundary;
}

export type RegionMembershipId<Name extends string = string> = Brand<Name, 'liteship.web.region-membership-id'>;
export type RegionMembershipReference<Id extends RegionMembershipId = RegionMembershipId> = Reference<
  'web-region-membership',
  Id
>;

/**
 * The persistent custody relationship a claim or transfer establishes. It
 * carries the admitted physical boundary it owns — a writer relationship
 * without a mutation domain would be authority over nothing — and outlives
 * any single transaction: listeners attach to it, islands hold it, and each
 * physical commit acquires its own transaction lease from it.
 */
export interface RegionMembership {
  readonly id: RegionMembershipReference;
  readonly region: RegionReference;
  readonly writer: RegionWriterReference;
  readonly boundary: RegionBoundary;
}

/** The complete claim request: an admitted mount, the writer, the revision. */
export interface RegionClaimRequest {
  readonly mount: MountRegion;
  readonly writer: RegionWriterReference;
  readonly revision: RevisionReference;
}

/** An explicit transfer of existing custody to a new writer. */
export interface RegionTransferRequest {
  readonly membership: RegionMembership;
  readonly to: RegionWriterReference;
  readonly revision: RevisionReference;
}

/** What one commit asks for: a lease on one membership at one exact revision and generation. */
export interface RegionLeaseRequest {
  readonly membership: RegionMembership;
  readonly revision: RevisionReference;
  readonly generation: TransactionGeneration;
}

/**
 * The persistent region manager the plan selects: it claims memberships from
 * admitted mounts, transfers and releases existing custody, and issues one
 * transaction-scoped `RegionWriteAuthority` per commit. Memberships are
 * repeatable per-use resources created by `claim` — two regions are two
 * memberships, not one deduplicated hole. Release operates on existing
 * custody; it is not an alternative constructor.
 */
export interface RegionAuthority {
  readonly claim: Signature<RegionClaimRequest, RegionMembership, NonEmptyTuple<Diagnostic>>;
  readonly transfer: Signature<RegionTransferRequest, RegionMembership, NonEmptyTuple<Diagnostic>>;
  readonly release: Signature<RegionMembership, RegionReference, NonEmptyTuple<Diagnostic>>;
  readonly issue: Signature<RegionLeaseRequest, RegionWriteAuthority, NonEmptyTuple<Diagnostic>>;
}

export type RegionDiscoveryRequirement = Hole<'liteship.web.region-discovery', RegionDiscovery>;
export type MountRegionRequirement = Hole<'liteship.web.mount-region', MountRegion>;
export type RegionAuthorityRequirement = Hole<'liteship.web.region-authority', RegionAuthority>;

/** Intrinsic grounding: the discovery authority derived from the document. */
export interface RegionDiscoveryGrounding
  extends WebGroundingDefinition<readonly [RegionDiscoveryRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.region-discovery'>;
}

/**
 * Application grounding: an existing mount whose custody the embedding
 * application transfers. Provenance is exact — an application transfer and an
 * invocation payload are different admitted facts with different slots.
 */
export interface ApplicationMountGrounding
  extends WebGroundingDefinition<readonly [MountRegionRequirement], MountRegion, 'application', 'owned'> {
  readonly id: GroundingId<'liteship.web.grounding.application-mount'>;
}

/** Invocation grounding: a mount carried by one concrete page entry, custody retained. */
export interface InvocationMountGrounding
  extends WebGroundingDefinition<readonly [MountRegionRequirement], MountRegion, 'invocation', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.invocation-mount'>;
}

/**
 * Standing up the region manager is an offer requiring the discovery
 * grounding. The manager is the stable capability; memberships and leases are
 * what it creates.
 */
export interface RegionAuthorityOffer
  extends WebRealizationOffer<
    readonly [RegionAuthorityRequirement],
    readonly [RegionDiscoveryRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.region-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the web topology. */
export interface WebRegionTypeSurface {
  readonly boundary: RegionBoundary;
  readonly custody: RegionCustody;
  readonly membership: RegionMembership;
  readonly manager: RegionAuthority;
  readonly authority: RegionWriteAuthority;
  readonly transition: RegionCustodyTransition;
  readonly preservation: RegionPreservationProfile;
  readonly index: RegionProjectionIndex;
  readonly discovery: RegionDiscoveryGrounding;
  readonly applicationMount: ApplicationMountGrounding;
  readonly invocationMount: InvocationMountGrounding;
  readonly offer: RegionAuthorityOffer;
}

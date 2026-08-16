/**
 * Compile-time laws for `01_hosts/web/01_region`.
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

import type { RevisionReference } from '../../../00_core/02_identity/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { DisposalReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, InputOf, NonEmptyTuple, OutputOf, TagOf } from '../../../types.js';
import type { MountRegion, ProjectionSubject, RegionAuthority, RegionAuthorityOffer, RegionAuthorityRequirement, RegionBoundary, RegionClaimRequest, RegionCustody, RegionCustodyTransition, RegionDiscovery, RegionDiscoveryRequirement, RegionLeaseRequest, RegionMembership, RegionMembershipReference, RegionProjectionIndex, RegionReference, RegionResolveRequest, RegionWriteAuthority, RegionWriterReference } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That no code path mutates a foreign descendant, that morphing never descends
// into an excluded boundary, and that preservation is honored under real
// browser state are assurance and implementation obligations, not type laws.
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a lease references its persistent membership and adds one
 * revision and one generation — region and writer live in the membership once,
 * with no restated sibling fields to disagree.
 */
export type ALeaseReferencesItsMembershipExactly = Assert<
  Equal<
    [
      RegionWriteAuthority['membership'],
      RegionWriteAuthority['revision'],
      RegionWriteAuthority['generation'],
      'region' extends keyof RegionWriteAuthority ? true : false,
      'writer' extends keyof RegionWriteAuthority ? true : false,
    ],
    [RegionMembership, RevisionReference, TransactionGeneration, false, false]
  >
>;


/** Compile-time law: a foreign region carries no writer key at any type. */
export type AForeignRegionHasNoWriter = Assert<
  Equal<'writer' extends keyof CaseOf<RegionCustody, 'foreign'> ? true : false, false>
>;


/** Compile-time law: every custody transition is revision-pinned. */
export type EveryCustodyTransitionIsRevisionPinned = Assert<
  Equal<RegionCustodyTransition extends { readonly revision: RevisionReference } ? true : false, true>
>;


/** Compile-time law: a boundary declares its exclusions; nesting is never implicit. */
export type ARegionBoundaryDeclaresItsExclusions = Assert<
  Equal<RegionBoundary['excluded'], readonly RegionReference[]>
>;


/** Compile-time law: addresses are semantic, never raw selectors. */
export type ProjectionSubjectsAreSemanticNeverSelectors = Assert<
  Equal<TagOf<ProjectionSubject>, 'location' | 'target'>
>;


/** Compile-time law: the projection index is pinned to one exact revision. */
export type TheProjectionIndexIsRevisionPinned = Assert<
  Equal<RegionProjectionIndex['revision'], RevisionReference>
>;


/** Compile-time law: the manager is an offer requiring discovery, providing the authority. */
export type TheManagerRequiresDiscoveryAndProvidesAuthority = Assert<
  Equal<
    [
      RegionAuthorityOffer['requires'],
      RegionAuthorityOffer['provides'],
      RegionAuthorityOffer['id'],
      RegionAuthorityOffer['locations'],
      RegionAuthorityOffer['backends'],
    ],
    [
      readonly [RegionDiscoveryRequirement],
      readonly [RegionAuthorityRequirement],
      RealizationOfferId<'liteship.web.offer.region-authority'>,
      NonEmptyTuple<'local' | 'live'>,
      NonEmptyTuple<'javascript'>,
    ]
  >
>;


/**
 * Compile-time law: a claim consumes an admitted mount — a physical boundary
 * — and produces a membership carrying that boundary. Reaching a node is not
 * authority; release operates on existing custody and constructs nothing.
 */
export type AClaimConsumesAnAdmittedBoundary = Assert<
  Equal<
    [InputOf<RegionAuthority['claim']>, RegionClaimRequest['mount'], RegionMembership['boundary']],
    [RegionClaimRequest, MountRegion, RegionBoundary]
  >
>;


/** Compile-time law: release consumes an existing membership, never a claim request. */
export type ReleaseOperatesOnExistingCustody = Assert<
  Equal<
    [InputOf<RegionAuthority['release']>, OutputOf<RegionAuthority['release']>],
    [RegionMembership, DisposalReceipt<RegionMembershipReference>]
  >
>;


/** Compile-time law: leases are issued per membership at exact coordinates. */
export type LeasesAreIssuedPerMembership = Assert<
  Equal<
    [InputOf<RegionAuthority['issue']>, RegionLeaseRequest['membership']],
    [RegionLeaseRequest, RegionMembership]
  >
>;


/** Compile-time law: memberships are repeatable resources — two coexist as values. */
export type TwoMembershipsAreRepresentable = Assert<
  Equal<
    readonly [RegionMembership, RegionMembership] extends readonly RegionMembership[] ? true : false,
    true
  >
>;


/** Compile-time law: one membership binds one writer, one region, one boundary. */
export type AMembershipBindsOneWriterOneRegionOneBoundary = Assert<
  Equal<
    [RegionMembership['writer'], RegionMembership['region'], RegionMembership['boundary']],
    [RegionWriterReference, RegionReference, RegionBoundary]
  >
>;


/** Compile-time law: discovery resolves inside a region at an exact revision. */
export type DiscoveryIsRegionAndRevisionAware = Assert<
  Equal<
    [InputOf<RegionDiscovery['locate']>, RegionResolveRequest['revision']],
    [RegionResolveRequest, RevisionReference]
  >
>;

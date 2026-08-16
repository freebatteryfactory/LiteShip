/**
 * Edge cache: canonical keys, explicit variation, private partitions.
 *
 * This home owns cache provider authority: entry identity, the key contract
 * derived from canonical upstream inputs plus explicit variation authority —
 * never a hand-built string — privacy partitioning, lookup, fill,
 * revalidation, invalidation, stale-policy shape, lifecycle, and receipts.
 * TTLs, stale windows, and cardinality limits are empirical.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition, EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type { CachePartitionKey, EdgePolicyRequirement } from '../03_policy/types.js';

export type CacheEntryId<Name extends string = string> = Brand<Name, 'liteship.edge.cache-entry-id'>;
export type CacheEntryReference<Id extends CacheEntryId = CacheEntryId> = Reference<
  'edge-cache-entry',
  Id
>;

/** The closed variation vocabulary. Variation is declared authority, never accident. */
export type CacheVariation = Algebra<{
  tenant: Record<never, never>;
  authorization: Record<never, never>;
  locale: Record<never, never>;
  capability: Record<never, never>;
  content: Record<never, never>;
}>;

/**
 * The cache key: the canonical input address plus the explicit variation row
 * and the privacy partition. Two requests differing in an undeclared axis
 * share a key by construction — which is why variation must be complete, an
 * assurance obligation this type makes checkable.
 */
export interface CacheKey {
  readonly input: ContentAddress<'application/vnd.liteship.edge-cache-input+cbor'>;
  readonly variations: NonEmptyTuple<CacheVariation>;
  readonly partition: CachePartitionKey;
}

/** One live cache entry: keyed, addressed, owned. */
export interface CacheEntry {
  readonly id: CacheEntryReference;
  readonly key: CacheKey;
  readonly content: ContentAddress<'application/vnd.liteship.edge-cache-content+cbor'>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The disposition of one lookup, phase-correct: hit, miss, stale, or bypass. */
export type CacheDisposition = Algebra<{
  hit: { readonly entry: CacheEntry };
  miss: Record<never, never>;
  stale: { readonly entry: CacheEntry };
  bypass: Record<never, never>;
}>;

/** The cache provider: lookup, fill, revalidate, and invalidate over exact keys. */
export interface EdgeCacheAuthority {
  readonly lookup: Signature<CacheKey, CacheDisposition, NonEmptyTuple<Diagnostic>>;
  readonly fill: Signature<CacheEntry, CacheEntryReference, NonEmptyTuple<Diagnostic>>;
  readonly revalidate: Signature<CacheEntryReference, CacheDisposition, NonEmptyTuple<Diagnostic>>;
  readonly invalidate: Signature<CacheKey, CacheKey, NonEmptyTuple<Diagnostic>>;
}

/** Narrow intrinsic authority over the platform cache machinery. */
export interface CacheFacility {
  readonly lookup: EdgeCacheAuthority['lookup'];
  readonly fill: EdgeCacheAuthority['fill'];
}

export type CacheFacilityRequirement = Hole<'liteship.edge.cache-facility', CacheFacility>;
export type EdgeCacheRequirement = Hole<'liteship.edge.cache', EdgeCacheAuthority>;

/** Intrinsic grounding: the platform cache, admitted narrowly. */
export interface CacheFacilityGrounding
  extends EdgeGroundingDefinition<
    readonly [CacheFacilityRequirement],
    CacheFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.cache-facility'>;
}

/** Constructing the cache provider: privacy is policy, so the policy is required. */
export interface EdgeCacheOffer
  extends EdgeRealizationOffer<
    readonly [EdgeCacheRequirement],
    readonly [CacheFacilityRequirement, EdgePolicyRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.cache-authority'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeCacheTypeSurface {
  readonly key: CacheKey;
  readonly entry: CacheEntry;
  readonly disposition: CacheDisposition;
  readonly authority: EdgeCacheAuthority;
  readonly facility: CacheFacilityGrounding;
  readonly cacheOffer: EdgeCacheOffer;
}

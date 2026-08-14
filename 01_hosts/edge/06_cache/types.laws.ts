/**
 * Compile-time laws for `01_hosts/edge/06_cache`.
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

import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, TagOf } from '../../../types.js';
import type { CachePartitionKey, EdgePolicyRequirement } from '../03_policy/types.js';
import type { CacheDisposition, CacheEntry, CacheFacilityRequirement, CacheKey, CacheVariation, EdgeCacheOffer } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That variation is complete and private data cannot cross partitions are
// `system/assurance`; TTLs and stale windows are empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: a key derives from canonical input, declared variation, and a partition. */
export type AKeyIsCanonicalAndPartitioned = Assert<
  Equal<
    [CacheKey['input'], CacheKey['variations'], CacheKey['partition']],
    [
      ContentAddress<'application/vnd.liteship.edge-cache-input+cbor'>,
      NonEmptyTuple<CacheVariation>,
      CachePartitionKey,
    ]
  >
>;


/** Compile-time law: the variation vocabulary is closed and exact. */
export type TheVariationVocabularyIsClosed = Assert<
  Equal<TagOf<CacheVariation>, 'tenant' | 'authorization' | 'locale' | 'capability' | 'content'>
>;


/** Compile-time law: the disposition arms are phase-correct, and hit and stale carry entries. */
export type DispositionsArePhaseCorrect = Assert<
  Equal<
    [TagOf<CacheDisposition>, CaseOf<CacheDisposition, 'hit'>['entry'], CaseOf<CacheDisposition, 'stale'>['entry']],
    ['hit' | 'miss' | 'stale' | 'bypass', CacheEntry, CacheEntry]
  >
>;


/** Compile-time law: caching requires the policy. */
export type CachingRequiresThePolicy = Assert<
  Equal<EdgeCacheOffer['requires'], readonly [CacheFacilityRequirement, EdgePolicyRequirement]>
>;

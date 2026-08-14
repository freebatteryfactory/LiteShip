/**
 * Edge security and response policy: fail-closed allowlists.
 *
 * This home owns edge-physical policy: origin and redirect constraints,
 * credential scope, response-header policy, isolation policy, and cache
 * privacy partitions. Policy is an allowlist over a closed grammar — never a
 * denylist over an open one — and it enters through a deployment grounding,
 * admitted and content-addressed, never assembled ad hoc per invocation.
 *
 * Advisory request evidence never turns into business authority here:
 * authorization remains server-authoritative; edge policy decides what the
 * edge may physically emit and fetch, not what a user is permitted to do.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  TagOf,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { GroundingId } from '../../../00_core/14_compiler/types.js';
import type { HostGroundingOrigin } from '../../types.js';
import type { EdgeGroundingDefinition } from '../00_bootstrap/types.js';

export type AllowedOrigin = Brand<string, 'liteship.edge.allowed-origin'>;
export type CachePartitionKey = Brand<string, 'liteship.edge.cache-partition'>;

/** Credential handling over the closed arms — never a free string. */
export type CredentialPolicy = Algebra<{
  omit: Record<never, never>;
  sameOrigin: Record<never, never>;
  include: { readonly origins: NonEmptyTuple<AllowedOrigin> };
}>;

/** Redirect handling over the closed arms. */
export type RedirectPolicy = Algebra<{
  refuse: Record<never, never>;
  follow: { readonly origins: NonEmptyTuple<AllowedOrigin> };
}>;

/** Isolation policy arms a selected cross-realm capability may require. */
export type IsolationPolicy = Algebra<{
  none: Record<never, never>;
  isolated: Record<never, never>;
}>;

/**
 * The complete edge policy: outbound origin allowlist, credential and
 * redirect arms, isolation arm, and the cache privacy partition vocabulary.
 * The policy is content-addressed so refusals and receipts can name exactly
 * which policy governed them.
 */
export interface EdgeResponsePolicy {
  readonly origins: NonEmptyTuple<AllowedOrigin>;
  readonly credentials: CredentialPolicy;
  readonly redirects: RedirectPolicy;
  readonly isolation: IsolationPolicy;
  readonly partitions: NonEmptyTuple<CachePartitionKey>;
  readonly address: ContentAddress<'application/vnd.liteship.edge-policy+cbor'>;
}

/** Per-arm-pinned refusal: every refusal names the exact policy arm that refused. */
export type EdgePolicyRefusal = Algebra<{
  origin: { readonly origin: AllowedOrigin; readonly policy: EdgeResponsePolicy['address'] };
  credentials: { readonly policy: EdgeResponsePolicy['address'] };
  redirect: { readonly policy: EdgeResponsePolicy['address'] };
  isolation: { readonly policy: EdgeResponsePolicy['address'] };
  partition: { readonly partition: CachePartitionKey; readonly policy: EdgeResponsePolicy['address'] };
}>;

export type EdgePolicyRequirement = Hole<'liteship.edge.response-policy', EdgeResponsePolicy>;

/** Deployment grounding: the policy enters admitted, never assembled ad hoc. */
export interface EdgePolicyGrounding
  extends EdgeGroundingDefinition<
    readonly [EdgePolicyRequirement],
    unknown,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.response-policy'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// That the policy is actually applied on the shipping path, and that private
// data cannot cross cache partitions, are `system/assurance` obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: the policy is a non-empty allowlist with pinned arms and an address. */
export type ThePolicyIsAFailClosedAllowlist = Assert<
  Equal<
    [EdgeResponsePolicy['origins'], EdgeResponsePolicy['address'], TagOf<CredentialPolicy>],
    [
      NonEmptyTuple<AllowedOrigin>,
      ContentAddress<'application/vnd.liteship.edge-policy+cbor'>,
      'omit' | 'sameOrigin' | 'include',
    ]
  >
>;

/** Compile-time law: every refusal arm names the exact governing policy address. */
export type EveryRefusalNamesItsPolicy = Assert<
  Equal<
    [
      CaseOf<EdgePolicyRefusal, 'origin'>['policy'],
      CaseOf<EdgePolicyRefusal, 'partition'>['policy'],
      TagOf<EdgePolicyRefusal>,
    ],
    [
      EdgeResponsePolicy['address'],
      EdgeResponsePolicy['address'],
      'origin' | 'credentials' | 'redirect' | 'isolation' | 'partition',
    ]
  >
>;

/** Compile-time law: the policy enters through a deployment grounding with unowned custody. */
export type ThePolicyEntersThroughItsGrounding = Assert<
  Equal<
    [EdgePolicyGrounding['origin'], EdgePolicyGrounding['custody']],
    [CaseOf<HostGroundingOrigin, 'deployment'>, 'unowned']
  >
>;

/** Type summary consumed by the edge topology. */
export interface EdgePolicyTypeSurface {
  readonly policy: EdgeResponsePolicy;
  readonly refusal: EdgePolicyRefusal;
  readonly policyGrounding: EdgePolicyGrounding;
}

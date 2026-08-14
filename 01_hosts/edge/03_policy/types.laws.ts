/**
 * Compile-time laws for `01_hosts/edge/03_policy`.
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
import type { HostGroundingOrigin } from '../../types.js';
import type { AllowedOrigin, CredentialPolicy, EdgePolicyGrounding, EdgePolicyRefusal, EdgeResponsePolicy } from './types.js';

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

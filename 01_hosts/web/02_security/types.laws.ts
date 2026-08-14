/**
 * Compile-time laws for `01_hosts/web/02_security`.
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

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { HostGroundingOrigin } from '../../types.js';
import type { AllowedAttributeName, AllowedElementName, AllowedEndpointOrigin, AllowedUrlScheme, CredentialsMode, RedirectMode, SinkPolicyGrounding, SinkPolicyRequirement, WebSinkKind, WebSinkPolicy, WebSinkRefusal } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That every physical write actually routes through the policy, and that
// trusted content remains subject to it, are assurance and implementation
// obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: the policy is allowlists — DOM and network — and no denylist field exists. */
export type ThePolicyIsAllowlistsNotDenylists = Assert<
  Equal<
    [
      WebSinkPolicy['schemes'],
      WebSinkPolicy['attributes'],
      WebSinkPolicy['elements'],
      WebSinkPolicy['origins'],
      WebSinkPolicy['credentials'],
      WebSinkPolicy['redirects'],
      'denied' extends keyof WebSinkPolicy ? true : false,
    ],
    [
      readonly AllowedUrlScheme[],
      readonly AllowedAttributeName[],
      readonly AllowedElementName[],
      readonly AllowedEndpointOrigin[],
      readonly CredentialsMode[],
      readonly RedirectMode[],
      false,
    ]
  >
>;


/** Compile-time law: every refusal carries its explanation. */
export type ARefusalAlwaysExplainsItself = Assert<
  Equal<WebSinkRefusal extends { readonly diagnostics: NonEmptyTuple<Diagnostic> } ? true : false, true>
>;


/** Compile-time law: text and markup remain distinct sinks. */
export type TextAndMarkupAreDistinctSinks = Assert<
  Equal<
    ['text' extends WebSinkKind ? true : false, 'markup' extends WebSinkKind ? true : false],
    [true, true]
  >
>;


/**
 * Compile-time law: a refusal's reason and sink cannot contradict each other.
 * Each reason is pinned to the exact sinks it can lawfully refuse.
 */
export type ARefusalCannotContradictItsSink = Assert<
  Equal<
    [
      CaseOf<WebSinkRefusal, 'scheme-refused'>['sink'],
      CaseOf<WebSinkRefusal, 'attribute-refused'>['sink'],
      CaseOf<WebSinkRefusal, 'element-refused'>['sink'],
      CaseOf<WebSinkRefusal, 'markup-refused'>['sink'],
      CaseOf<WebSinkRefusal, 'listener-refused'>['sink'],
    ],
    ['url', 'attribute', 'element' | 'node-construction', 'markup', 'listener']
  >
>;


/** Compile-time law: the policy enters as an admitted grounding pinned to deployment. */
export type ThePolicyEntersThroughAGroundingSlot = Assert<
  Equal<
    [SinkPolicyGrounding['provides'], SinkPolicyGrounding['origin'], SinkPolicyGrounding['custody']],
    [readonly [SinkPolicyRequirement], CaseOf<HostGroundingOrigin, 'deployment'>, 'unowned']
  >
>;

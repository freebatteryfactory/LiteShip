/**
 * Browser sink policy: fail-closed allowlists at the physical write.
 *
 * This home owns the physical browser policy for URL schemes, attributes,
 * elements, HTML sinks, Trusted Types, node construction, text insertion, and
 * listener attachment. It does not own semantic admission — core admits
 * content meaning — and it does not define a universal trust ladder: the trust
 * families are structurally distinct routes declared where they are applied.
 *
 * Every policy is an allowlist. A denylist over an open grammar spawns endless
 * neighboring evasions; an empty allowlist safely denies everything.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Hole,
  NonEmptyTuple,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';

import type { GroundingId } from '../../../00_core/14_compiler/types.js';
import type { WebGroundingDefinition } from '../00_bootstrap/types.js';

/** URL scheme admitted by the web security policy. */
export type AllowedUrlScheme = Brand<string, 'liteship.web.allowed-url-scheme'>;
/** Type-level representation of allowed attribute name. */
export type AllowedAttributeName = Brand<string, 'liteship.web.allowed-attribute'>;
/** Type-level representation of allowed element name. */
export type AllowedElementName = Brand<string, 'liteship.web.allowed-element'>;
/** Closed origin vocabulary for allowed endpoint. */
export type AllowedEndpointOrigin = Brand<string, 'liteship.web.allowed-origin'>;
/** Deployment-grounded Trusted Types policy identity. */
export type TrustedTypesPolicyName = Brand<string, 'liteship.web.trusted-types-policy'>;
/** Browser credentials modes a policy may allow. */
export type CredentialsMode = 'omit' | 'same-origin' | 'include';
/** Browser redirect modes a policy may allow. */
export type RedirectMode = 'follow' | 'error' | 'manual';

/**
 * The physical sinks this policy governs. Text insertion is its own sink,
 * distinct from markup: the preserved safe default for generated text is
 * physical text insertion, never markup interpretation.
 */
export type WebSinkKind =
  | 'url'
  | 'attribute'
  | 'element'
  | 'markup'
  | 'text'
  | 'node-construction'
  | 'listener';

/**
 * Fail-closed allowlist policy applied at the physical write — and at the
 * physical network edge: endpoint origins, credentials modes, and redirect
 * behavior are allowlists exactly like schemes and attributes, because the
 * browser security boundary does not stop at DOM sinks. Content admission
 * remains a separate boundary; this is not one universal sanitizer.
 */
export interface WebSinkPolicy {
  readonly schemes: readonly AllowedUrlScheme[];
  readonly attributes: readonly AllowedAttributeName[];
  readonly elements: readonly AllowedElementName[];
  readonly origins: readonly AllowedEndpointOrigin[];
  readonly credentials: readonly CredentialsMode[];
  readonly redirects: readonly RedirectMode[];
  readonly trustedTypes: TrustedTypesPolicyName;
  readonly address: ContentAddress<'application/vnd.liteship.web-sink-policy+cbor'>;
}

/**
 * Why the physical sink refused a write. Every refusal explains itself, and
 * every reason's sink type is constrained to the sinks that reason can
 * lawfully refuse — a scheme refusal cannot claim it happened at a listener.
 * The `text` sink is deliberately absent: physical text insertion is the safe
 * default and is infallible by design.
 */
export type WebSinkRefusal = Algebra<{
  'scheme-refused': { readonly sink: 'url'; readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'attribute-refused': { readonly sink: 'attribute'; readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'element-refused': {
    readonly sink: 'element' | 'node-construction';
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'markup-refused': { readonly sink: 'markup'; readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'listener-refused': { readonly sink: 'listener'; readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The policy authority every physical write consumes. */
export type SinkPolicyRequirement = Hole<'liteship.web.sink-policy', WebSinkPolicy>;

/** Deployment grounding: the policy arrives as public configuration, admitted. */
export interface SinkPolicyGrounding
  extends WebGroundingDefinition<readonly [SinkPolicyRequirement], WebSinkPolicy, 'deployment', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.sink-policy'>;
}

/** Type summary consumed by the web topology. */
export interface WebSecurityTypeSurface {
  readonly policy: WebSinkPolicy;
  readonly sink: WebSinkKind;
  readonly refusal: WebSinkRefusal;
  readonly requirement: SinkPolicyRequirement;
  readonly grounding: SinkPolicyGrounding;
}

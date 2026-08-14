/**
 * The exact physical incoming request.
 *
 * This home owns the admitted request resource: identity, method, URL,
 * headers, cookies, one-shot body relationships, provenance, correlation,
 * cancellation, and lifecycle. It owns raw representation admission — it does
 * not own operation meaning or the HTTP wire projection, which arrive
 * downstream over the same admitted value.
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
import type { GroundingId, RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition } from '../00_bootstrap/types.js';

export type EdgeRequestId<Name extends string = string> = Brand<Name, 'liteship.edge.request-id'>;
export type EdgeRequestReference<Id extends EdgeRequestId = EdgeRequestId> = Reference<
  'edge-request',
  Id
>;

/** The closed method vocabulary this realm admits. */
export type RequestMethod = 'get' | 'head' | 'post' | 'put' | 'patch' | 'delete' | 'options';

/** An admitted URL — decoded through canonical admission, never a raw string. */
export type AdmittedUrl = Brand<string, 'liteship.edge.admitted-url'>;
/** An admitted header name/value pair, decoded, never raw wire bytes. */
export type AdmittedHeaderName = Brand<string, 'liteship.edge.header-name'>;
export type AdmittedHeaderValue = Brand<string, 'liteship.edge.header-value'>;
export type AdmittedCookieName = Brand<string, 'liteship.edge.cookie-name'>;
export type AdmittedCookieValue = Brand<string, 'liteship.edge.cookie-value'>;

/** One admitted header entry. The map is a readonly row, not a mutable bag. */
export interface AdmittedHeader {
  readonly name: AdmittedHeaderName;
  readonly value: AdmittedHeaderValue;
}

/** One admitted cookie entry. */
export interface AdmittedCookie {
  readonly name: AdmittedCookieName;
  readonly value: AdmittedCookieValue;
}

/**
 * The one-shot body relationship: unconsumed, consumed through a named
 * address, or explicitly cloned. Consuming twice is unrepresentable as a
 * lawful state; cloning is a declared act, never an accident.
 */
export type BodyConsumption = Algebra<{
  unconsumed: Record<never, never>;
  consumed: { readonly through: ContentAddress<'application/vnd.liteship.edge-body+cbor'> };
  cloned: Record<never, never>;
}>;

/**
 * The admitted incoming request: one per invocation, unowned custody — the
 * platform holds its lifetime, generic over its exact identity with no
 * erasing default. Everything on it is decoded, and every operation speaks
 * exactly this request: request A's consume, clone, and cancellation cannot
 * accept request B. The invocation address records provenance — which entry
 * this request arrived on.
 */
/**
 * One addressed clone of a request body: a real per-use owned resource with
 * explicit ancestry — which request it tees, and the address its copy lives
 * behind. Cloning is never a silent state flip.
 */
export interface RequestClone<Id extends EdgeRequestId> {
  readonly request: EdgeRequestReference<Id>;
  readonly address: ContentAddress<'application/vnd.liteship.edge-body-clone+cbor'>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

export interface AdmittedRequest<Id extends EdgeRequestId> {
  readonly id: EdgeRequestReference<Id>;
  readonly invocation: ContentAddress<'application/vnd.liteship.edge-invocation+cbor'>;
  readonly trace: ContentAddress<'application/vnd.liteship.edge-request-trace+cbor'>;
  readonly method: RequestMethod;
  readonly url: AdmittedUrl;
  readonly headers: readonly AdmittedHeader[];
  readonly cookies: readonly AdmittedCookie[];
  readonly body: BodyConsumption;
  readonly consume: Signature<
    EdgeRequestReference<Id>,
    CaseOf<BodyConsumption, 'consumed'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly clone: Signature<EdgeRequestReference<Id>, RequestClone<Id>, NonEmptyTuple<Diagnostic>>;
  readonly cancelled: Signature<EdgeRequestReference<Id>, boolean, readonly []>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'unowned'>;
}

export type AdmittedRequestRequirement = Hole<'liteship.edge.request', AdmittedRequest<EdgeRequestId>>;

/** Invocation grounding: the incoming request carried by the entry itself. */
export interface RequestGrounding
  extends EdgeGroundingDefinition<
    readonly [AdmittedRequestRequirement],
    unknown,
    'invocation',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.request'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeRequestTypeSurface {
  readonly request: AdmittedRequest<EdgeRequestId>;
  readonly requestClone: RequestClone<EdgeRequestId>;
  readonly body: BodyConsumption;
  readonly requestGrounding: RequestGrounding;
}

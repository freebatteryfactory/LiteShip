/**
 * Edge outbound network: origins, service bindings, and typed connections.
 *
 * This home owns physical outbound request resources: connection identity,
 * decoder-correlated opening, body streaming, cancellation, backpressure,
 * response admission, lifecycle, and failure. It consumes the edge policy at
 * every open — no connection exists outside the network allowlists. It does
 * not duplicate core stream families or the HTTP operation wire.
 *
 * @module
 */

import type {
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition, EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RequestMethod } from '../01_request/types.js';
import type { AllowedOrigin, EdgePolicyRequirement } from '../03_policy/types.js';

export type OutboundConnectionId<Name extends string = string> = Brand<
  Name,
  'liteship.edge.outbound-connection-id'
>;
export type OutboundRequestId<Name extends string = string> = Brand<
  Name,
  'liteship.edge.outbound-request-id'
>;
export type OutboundRequestReference<Id extends OutboundRequestId = OutboundRequestId> = Reference<
  'edge-outbound-request',
  Id
>;
export type OutboundConnectionReference<
  Id extends OutboundConnectionId = OutboundConnectionId,
> = Reference<'edge-outbound-connection', Id>;

/** An encoded chunk before admission. */
export type EdgeEncodedChunk = Brand<Uint8Array, 'liteship.edge.encoded-chunk'>;

/** One decode contract: encoded input, typed output, typed failure. */
export interface EdgeDecodeContract<Decoded> {
  readonly decode: Signature<EdgeEncodedChunk, Decoded, NonEmptyTuple<Diagnostic>>;
}

/** Bounded receive shape — admission and backpressure, never a numeric constant. */
export interface EdgeBufferBound {
  readonly bounded: true;
}

/**
 * The complete outbound open request: its own physical request identity, the
 * policy-admitted origin, the method, the addressed body it will send, the
 * decoder, and the bound. The identity parameter has no default — an
 * outbound request that does not say which request it is is not a lawful
 * type.
 */
export interface OutboundOpenRequest<Decoded, Rid extends OutboundRequestId> {
  readonly id: OutboundRequestReference<Rid>;
  readonly origin: AllowedOrigin;
  readonly method: RequestMethod;
  readonly body: ContentAddress<'application/vnd.liteship.edge-outbound-body+cbor'>;
  readonly decoder: EdgeDecodeContract<Decoded>;
  readonly buffer: EdgeBufferBound;
}

/**
 * One live outbound connection: a per-use owned resource whose decoder and
 * received values share one decoded type, with real receive and cancel
 * operations.
 */
export interface EdgeOutboundConnection<Decoded, Rid extends OutboundRequestId> {
  readonly id: OutboundConnectionReference;
  readonly request: OutboundRequestReference<Rid>;
  readonly origin: AllowedOrigin;
  readonly decoder: EdgeDecodeContract<Decoded>;
  readonly buffer: EdgeBufferBound;
  readonly send: Signature<EdgeEncodedChunk, OutboundConnectionReference, NonEmptyTuple<Diagnostic>>;
  readonly receive: Signature<EdgeBufferBound, readonly Decoded[], NonEmptyTuple<Diagnostic>>;
  readonly cancel: Signature<
    OutboundConnectionReference,
    CancellationReceipt<OutboundConnectionReference>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority over the platform's outbound fetch machinery. */
export interface EdgeNetworkFacility {
  readonly open: EdgeNetworkAuthority['open'];
}

/**
 * The outbound network provider. Opening is decoder-correlated: a request
 * with a string decode contract yields a connection of strings, provably not
 * a connection of another decoded type.
 */
export interface EdgeNetworkAuthority {
  readonly open: <Decoded, Rid extends OutboundRequestId>(
    request: OutboundOpenRequest<Decoded, Rid>,
  ) => Result<EdgeOutboundConnection<Decoded, Rid>, NonEmptyTuple<Diagnostic>>;
}

export type EdgeNetworkFacilityRequirement = Hole<
  'liteship.edge.network-facility',
  EdgeNetworkFacility
>;
export type EdgeNetworkRequirement = Hole<'liteship.edge.network', EdgeNetworkAuthority>;

/** Intrinsic grounding: the outbound fetch machinery, admitted narrowly. */
export interface EdgeNetworkFacilityGrounding
  extends EdgeGroundingDefinition<
    readonly [EdgeNetworkFacilityRequirement],
    EdgeNetworkFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.network-facility'>;
}

/** Constructing the network provider: no connection opens outside the policy. */
export interface EdgeNetworkOffer
  extends EdgeRealizationOffer<
    readonly [EdgeNetworkRequirement],
    readonly [EdgeNetworkFacilityRequirement, EdgePolicyRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.network-authority'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeNetworkTypeSurface {
  readonly connection: EdgeOutboundConnection<Uint8Array, OutboundRequestId>;
  readonly authority: EdgeNetworkAuthority;
  readonly facility: EdgeNetworkFacilityGrounding;
  readonly networkOffer: EdgeNetworkOffer;
}

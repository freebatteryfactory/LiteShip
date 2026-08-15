/**
 * Server network: outbound clients and inbound listeners.
 *
 * This home owns physical network providers: decoder-correlated outbound
 * connections, listener and socket resources, an endpoint allowlist,
 * cancellation, bounded receive, lifecycle, and failure. HTTP meaning stays
 * in the later HTTP wire; this home moves admitted bytes and typed decoded
 * values, nothing more.
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
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';

export type ServerConnectionId<Name extends string = string> = Brand<
  Name,
  'liteship.server.connection-id'
>;
export type ServerConnectionReference<
  Id extends ServerConnectionId = ServerConnectionId,
> = Reference<'server-connection', Id>;

export type ListenerId<Name extends string = string> = Brand<Name, 'liteship.server.listener-id'>;
export type ListenerReference<Id extends ListenerId = ListenerId> = Reference<
  'server-listener',
  Id
>;

/** An allowed endpoint — admitted against deployment policy, never a raw string. */
export type AllowedEndpoint = Brand<string, 'liteship.server.allowed-endpoint'>;

/** An encoded chunk before admission. */
export type ServerEncodedChunk = Brand<Uint8Array, 'liteship.server.encoded-chunk'>;

/** One decode contract: encoded input, typed output, typed failure. */
export interface ServerDecodeContract<Decoded> {
  readonly decode: Signature<ServerEncodedChunk, Decoded, NonEmptyTuple<Diagnostic>>;
}

/** Bounded receive shape. */
export interface ServerBufferBound {
  readonly bounded: true;
}

/** The complete outbound request: admitted endpoint, decoder, bound. */
export interface ServerConnectRequest<Decoded> {
  readonly endpoint: AllowedEndpoint;
  readonly decoder: ServerDecodeContract<Decoded>;
  readonly buffer: ServerBufferBound;
}

/** One live outbound connection: decoder and received values share one type. */
export interface ServerConnection<Decoded> {
  readonly id: ServerConnectionReference;
  readonly endpoint: AllowedEndpoint;
  readonly decoder: ServerDecodeContract<Decoded>;
  readonly buffer: ServerBufferBound;
  readonly send: Signature<ServerEncodedChunk, ServerConnectionReference, NonEmptyTuple<Diagnostic>>;
  readonly receive: Signature<ServerBufferBound, readonly Decoded[], NonEmptyTuple<Diagnostic>>;
  readonly cancel: Signature<
    ServerConnectionReference,
    CancellationReceipt<ServerConnectionReference>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** One live listener: an owned resource accepting per-use socket connections. */
export interface ListenerResource {
  readonly id: ListenerReference;
  readonly endpoint: AllowedEndpoint;
  readonly accept: Signature<
    ServerBufferBound,
    readonly ServerConnection<Uint8Array>[],
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The server network provider: decoder-correlated connecting and endpoint-
 * admitted listening. No connection or listener exists outside the endpoint
 * allowlist.
 */
export interface ServerNetworkAuthority {
  readonly connect: <Decoded>(
    request: ServerConnectRequest<Decoded>,
  ) => Result<ServerConnection<Decoded>, NonEmptyTuple<Diagnostic>>;
  readonly listen: Signature<AllowedEndpoint, ListenerResource, NonEmptyTuple<Diagnostic>>;
}

/** Narrow intrinsic authority over the host network machinery. */
export interface ServerNetworkFacility {
  readonly admitted: true;
}

export type ServerNetworkFacilityRequirement = Hole<
  'liteship.server.network-facility',
  ServerNetworkFacility
>;
export type ServerNetworkRequirement = Hole<'liteship.server.network', ServerNetworkAuthority>;

/** Intrinsic grounding: the host network machinery, admitted narrowly. */
export interface ServerNetworkFacilityGrounding
  extends ServerGroundingDefinition<
    readonly [ServerNetworkFacilityRequirement],
    ServerNetworkFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.network-facility'>;
}

/** Constructing the network provider. */
export interface ServerNetworkOffer
  extends ServerRealizationOffer<
    readonly [ServerNetworkRequirement],
    readonly [ServerNetworkFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.network-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the server topology. */
export interface ServerNetworkTypeSurface {
  readonly connection: ServerConnection<Uint8Array>;
  readonly listener: ListenerResource;
  readonly authority: ServerNetworkAuthority;
  readonly facility: ServerNetworkFacilityGrounding;
  readonly networkOffer: ServerNetworkOffer;
}

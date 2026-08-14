/**
 * Physical worker messaging: channels, endpoints, and typed envelopes.
 *
 * This home owns channel and endpoint identity, addressed envelopes, decoded
 * payload relationships, ordering, correlation, reply, acknowledgement,
 * cancellation, closure, and bounded flow. It realizes upstream stream and
 * operation contracts without inventing a second stream language — worker
 * messages carry core families; they never redefine them.
 *
 * The identity graph is exact and threads through every operation: a channel
 * is generic over its decoded payload *and* its own identity, an envelope
 * names the exact channel it travels, a send with correlation A yields an
 * acknowledgement naming exactly correlation A, and a reply answers the same
 * correlation family it received. None of these parameters has an erasing
 * default in the identity position.
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
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { WorkerGroundingDefinition, WorkerRealizationOffer } from '../00_bootstrap/types.js';

export type ChannelId<Name extends string = string> = Brand<Name, 'liteship.worker.channel-id'>;
export type ChannelReference<Id extends ChannelId = ChannelId> = Reference<'worker-channel', Id>;
export type CorrelationId<Name extends string = string> = Brand<
  Name,
  'liteship.worker.correlation-id'
>;

/** The two endpoint roles of one channel. A channel has exactly one of each. */
export type EndpointRole = 'parent' | 'worker';

/** An encoded chunk before admission. Raw bytes never cross into consumers. */
export type WorkerEncodedChunk = Brand<Uint8Array, 'liteship.worker.encoded-chunk'>;

/** One decode contract: encoded input, typed output, typed failure. */
export interface MessageDecodeContract<Decoded> {
  readonly decode: Signature<WorkerEncodedChunk, Decoded, NonEmptyTuple<Diagnostic>>;
}

/** Bounded buffering: admission and backpressure shape, never a numeric constant. */
export interface MessageBufferBound {
  readonly bounded: true;
}

/**
 * One addressed message: the exact channel it travels, its exact correlation
 * identity, and the decoded payload. The channel and correlation parameters
 * have no defaults — an envelope that does not say which channel and which
 * correlation it belongs to is not a lawful type.
 */
export interface MessageEnvelope<
  Decoded,
  Channel extends ChannelId,
  C extends CorrelationId,
> {
  readonly channel: ChannelReference<Channel>;
  readonly correlation: C;
  readonly payload: Decoded;
}

/** A delivery acknowledgement bound to the exact correlation it answers. */
export interface DeliveryReceipt<C extends CorrelationId> {
  readonly correlation: C;
}

/**
 * One live channel: a per-use owned resource whose decoder, envelopes, and
 * operations share one decoded type and one exact channel identity. `send`
 * yields the acknowledgement for the exact correlation sent; `receive`
 * yields admitted envelopes of this exact channel; `reply` answers the exact
 * correlation it was given; `closeChannel` closes exactly this channel.
 */
export interface WorkerChannel<Decoded, Id extends ChannelId> {
  readonly id: ChannelReference<Id>;
  readonly role: EndpointRole;
  readonly decoder: MessageDecodeContract<Decoded>;
  readonly buffer: MessageBufferBound;
  readonly send: <C extends CorrelationId>(
    envelope: MessageEnvelope<Decoded, Id, C>,
  ) => Result<DeliveryReceipt<C>, NonEmptyTuple<Diagnostic>>;
  readonly receive: Signature<
    MessageBufferBound,
    readonly MessageEnvelope<Decoded, Id, CorrelationId>[],
    NonEmptyTuple<Diagnostic>
  >;
  readonly reply: <C extends CorrelationId>(
    envelope: MessageEnvelope<Decoded, Id, C>,
  ) => Result<DeliveryReceipt<C>, NonEmptyTuple<Diagnostic>>;
  readonly closeChannel: Signature<ChannelReference<Id>, ChannelReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete open request: exact channel identity, role, decoder, and bound. */
export interface ChannelOpenRequest<Decoded, Id extends ChannelId> {
  readonly channel: ChannelReference<Id>;
  readonly role: EndpointRole;
  readonly decoder: MessageDecodeContract<Decoded>;
  readonly buffer: MessageBufferBound;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority over the realm's physical message machinery. */
export interface MessageFacility {
  readonly endpoint: EndpointRole;
}

/**
 * The persistent messaging provider. Opening is decoder- and
 * identity-correlated: a request naming channel A with a string decode
 * contract yields exactly channel A speaking strings.
 */
export interface MessagingAuthority {
  readonly open: <Decoded, Id extends ChannelId>(
    request: ChannelOpenRequest<Decoded, Id>,
  ) => Result<WorkerChannel<Decoded, Id>, NonEmptyTuple<Diagnostic>>;
}

export type MessageFacilityRequirement = Hole<'liteship.worker.message-facility', MessageFacility>;
export type MessagingRequirement = Hole<'liteship.worker.messaging', MessagingAuthority>;

/** Intrinsic grounding: the postMessage-family machinery, admitted narrowly. */
export interface MessageFacilityGrounding
  extends WorkerGroundingDefinition<
    readonly [MessageFacilityRequirement],
    unknown,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.worker.grounding.message-facility'>;
}

/** Constructing the messaging provider: channels are per-use resources it creates. */
export interface MessagingAuthorityOffer
  extends WorkerRealizationOffer<
    readonly [MessagingRequirement],
    readonly [MessageFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.worker.offer.messaging-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the worker topology. */
export interface WorkerMessageTypeSurface {
  readonly channel: WorkerChannel<CanonicalValue, ChannelId>;
  readonly envelope: MessageEnvelope<CanonicalValue, ChannelId, CorrelationId>;
  readonly authority: MessagingAuthority;
  readonly facility: MessageFacilityGrounding;
  readonly messagingOffer: MessagingAuthorityOffer;
}

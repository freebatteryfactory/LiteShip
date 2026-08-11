/**
 * Physical browser transport: fetch, SSE, and readable streams.
 *
 * Core owns stream envelopes, acknowledgements, checkpoints, replay, patch
 * families, completeness, and backpressure meaning. A later browser wire owns
 * protocol translation. This home owns exactly the physical connection: its
 * creation, cancellation, watchdog, reconnection, bounded buffering, typed
 * carrier decoding, and resumption transport.
 *
 * One physical transport authority, one typed carrier path — but transports
 * are not pretended identical: a one-shot fetch carries no heartbeat,
 * reconnection, or resumption, because it has nothing to resume. Resumption,
 * where it exists, is core's `StreamResumeRequest` — stream identity,
 * acknowledgement, and checkpoint together — never a naked sequence number
 * that cannot say which stream it acknowledges.
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
  OutputOf,
  Reference,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { StreamResumeRequest } from '../../../00_core/13_stream/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { Result } from '../../../types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';
import type { SinkPolicyRequirement } from '../02_security/types.js';

export type ConnectionId<Name extends string = string> = Brand<Name, 'liteship.web.connection-id'>;
export type ConnectionReference<Id extends ConnectionId = ConnectionId> = Reference<
  'web-connection',
  Id
>;
/** Deployment-grounded public endpoint identity. */
export type TransportEndpoint = Brand<string, 'liteship.web.endpoint'>;
/** Raw encoded bytes as they arrive from the physical connection. */
export type EncodedChunk = Brand<Uint8Array, 'liteship.web.encoded-chunk'>;

/** A real typed decode contract: encoded input, decoded output, typed failure. */
export interface CarrierDecodeContract<Decoded> {
  readonly decode: Signature<EncodedChunk, Decoded, NonEmptyTuple<Diagnostic>>;
}

/**
 * The closed, declared carrier set. Each arm carries an actual decode
 * contract, not an empty tag: a carrier without a decoder is a roster entry,
 * not a capability.
 */
export type CarrierDecoder = Algebra<{
  json: { readonly contract: CarrierDecodeContract<CanonicalValue> };
  text: { readonly contract: CarrierDecodeContract<string> };
  binary: { readonly contract: CarrierDecodeContract<Uint8Array> };
}>;

/** Bounded buffering. An unbounded browser connection is not a connection, it is a leak. */
export interface BufferBound {
  readonly maxEvents: number;
  readonly maxBytes: number;
}

/** Reconnection shape. The constants are empirical; the shape is not. */
export interface ReconnectionPolicy {
  readonly initialDelayMilliseconds: number;
  readonly maxDelayMilliseconds: number;
  readonly multiplier: number;
}

/** Heartbeat watchdog shape. Constants empirical. */
export interface HeartbeatPolicy {
  readonly intervalMilliseconds: number;
  readonly timeoutMilliseconds: number;
}

/**
 * What every physical connection has: identity, endpoint, carrier, bound,
 * owner — and an actual consumption operation producing *decoded* values.
 * A connection whose receive path returned raw bytes would make the typed
 * decoder ornamental; a connection with no receive path would be a
 * photograph of a pipe.
 */
interface ConnectionCommon<Decoded> {
  readonly id: ConnectionReference;
  readonly endpoint: TransportEndpoint;
  readonly decoder: CarrierDecodeContract<Decoded>;
  readonly buffer: BufferBound;
  readonly receive: Signature<BufferBound, readonly Decoded[], NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The physical connection algebra. A shared base plus exact arms: fetch is
 * one-shot; an event-source is long-lived and carries heartbeat, reconnection,
 * and core resumption; a readable stream is consumed once and cancelled
 * through its owned lifecycle.
 */
export type WebConnection<Decoded = CanonicalValue> = Algebra<{
  fetch: ConnectionCommon<Decoded>;
  'event-source': ConnectionCommon<Decoded> & {
    readonly heartbeat: HeartbeatPolicy;
    readonly reconnection: ReconnectionPolicy;
    readonly resumption: StreamResumeRequest;
  };
  'readable-stream': ConnectionCommon<Decoded>;
}>;

/** The transport kinds, derived from the algebra rather than restated. */
export type WebTransportKind = TagOf<WebConnection>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** What every open request carries, regardless of arm: the exact decoder contract. */
interface OpenRequestCommon<Decoded> {
  readonly endpoint: TransportEndpoint;
  readonly decoder: CarrierDecodeContract<Decoded>;
  readonly buffer: BufferBound;
}

/**
 * The complete open request, arm by arm. Each transport asks for exactly what
 * it supports: a one-shot fetch carries no replay machinery; an event-source
 * binds heartbeat, reconnection, and the core resume request; a readable
 * stream is consumed once and cancelled through its lifecycle. The decoder is
 * the exact typed contract, never a bare carrier tag.
 */
export type TransportOpenRequest<Decoded = CanonicalValue> = Algebra<{
  fetch: OpenRequestCommon<Decoded>;
  'event-source': OpenRequestCommon<Decoded> & {
    readonly heartbeat: HeartbeatPolicy;
    readonly reconnection: ReconnectionPolicy;
    readonly resume: StreamResumeRequest;
  };
  'readable-stream': OpenRequestCommon<Decoded>;
}>;

/**
 * The persistent provider the plan selects: it opens connections on demand.
 * A live connection is a per-use resource with its own identity and owned
 * lifecycle, never the plan-level binding itself.
 */
export interface TransportAuthority {
  readonly open: <Kind extends WebTransportKind, Decoded>(
    request: CaseOf<TransportOpenRequest<Decoded>, Kind>,
  ) => Result<CaseOf<WebConnection<Decoded>, Kind>, NonEmptyTuple<Diagnostic>>;
}

/**
 * Narrow intrinsic authority over the browser's physical transport
 * entrypoints — fetch, EventSource, and readable streams together. It is
 * named for what it actually contains, not for the one entrypoint every road
 * eventually smells like.
 */
export interface BrowserTransportFacility {
  readonly open: <Kind extends WebTransportKind, Decoded>(
    request: CaseOf<TransportOpenRequest<Decoded>, Kind>,
  ) => Result<CaseOf<WebConnection<Decoded>, Kind>, NonEmptyTuple<Diagnostic>>;
}

export type TransportFacilityRequirement = Hole<'liteship.web.transport-facility', BrowserTransportFacility>;
export type TransportAuthorityRequirement = Hole<'liteship.web.transport-authority', TransportAuthority>;

/** Intrinsic grounding: the browser transport entrypoints, admitted narrowly. */
export interface TransportFacilityGrounding
  extends WebGroundingDefinition<readonly [TransportFacilityRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.transport-facility'>;
}

/** Standing up the transport authority is an offer requiring the facility. */
export interface TransportAuthorityOffer
  extends WebRealizationOffer<
    readonly [TransportAuthorityRequirement],
    readonly [TransportFacilityRequirement, SinkPolicyRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.transport-authority'>;
  readonly locations: NonEmptyTuple<'remote'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// Reconnection constants, buffer sizes, and heartbeat intervals are empirical.
// That one unified transport serves every carrier is an assurance obligation
// over the transport population.
// ---------------------------------------------------------------------------

/** Compile-time law: every connection arm is bounded and owned. */
export type EveryConnectionIsBoundedAndOwned = Assert<
  Equal<
    WebConnection extends {
      readonly buffer: BufferBound;
      readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
    }
      ? true
      : false,
    true
  >
>;

/** Compile-time law: resumption keeps the whole stream identity, never a naked sequence. */
export type ResumptionKeepsTheStreamIdentity = Assert<
  Equal<CaseOf<WebConnection, 'event-source'>['resumption'], StreamResumeRequest>
>;

/** Compile-time law: a one-shot fetch has nothing to resume and carries none of it. */
export type AOneShotFetchCarriesNoReplayMachinery = Assert<
  Equal<
    [
      'resumption' extends keyof CaseOf<WebConnection, 'fetch'> ? true : false,
      'heartbeat' extends keyof CaseOf<WebConnection, 'fetch'> ? true : false,
      'reconnection' extends keyof CaseOf<WebConnection, 'fetch'> ? true : false,
    ],
    [false, false, false]
  >
>;

/** Compile-time law: the carrier set is closed and every carrier decodes. */
export type EveryCarrierActuallyDecodes = Assert<
  Equal<
    [
      TagOf<CarrierDecoder>,
      CaseOf<CarrierDecoder, 'json'>['contract'],
      CaseOf<CarrierDecoder, 'text'>['contract'],
    ],
    ['json' | 'text' | 'binary', CarrierDecodeContract<CanonicalValue>, CarrierDecodeContract<string>]
  >
>;

/** Compile-time law: the authority requires the facility and the network policy. */
export type TheAuthorityRequiresFacilityAndPolicy = Assert<
  Equal<
    [
      TransportAuthorityOffer['provides'],
      TransportAuthorityOffer['requires'],
      TransportAuthorityOffer['id'],
      TransportAuthorityOffer['locations'],
    ],
    [
      readonly [TransportAuthorityRequirement],
      readonly [TransportFacilityRequirement, SinkPolicyRequirement],
      RealizationOfferId<'liteship.web.offer.transport-authority'>,
      NonEmptyTuple<'remote'>,
    ]
  >
>;

/**
 * Compile-time law: opening is arm- and decoder-correlated — a fetch request
 * yields a fetch connection, a text decoder yields string values, replay
 * state exists only on the event-source arm, and no request arm can
 * structurally return another connection arm.
 */
export type OpeningIsArmAndDecoderCorrelated = Assert<
  Equal<
    [
      TransportAuthority['open'] extends (
        request: CaseOf<TransportOpenRequest<string>, 'fetch'>,
      ) => Result<CaseOf<WebConnection<string>, 'fetch'>, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      CaseOf<TransportOpenRequest, 'fetch'>['decoder'],
      'resume' extends keyof CaseOf<TransportOpenRequest, 'fetch'> ? true : false,
      'resume' extends keyof CaseOf<TransportOpenRequest, 'readable-stream'> ? true : false,
      CaseOf<TransportOpenRequest, 'event-source'>['resume'],
      OutputOf<CaseOf<WebConnection<string>, 'fetch'>['receive']>,
    ],
    [
      true,
      CarrierDecodeContract<CanonicalValue>,
      false,
      false,
      StreamResumeRequest,
      readonly string[],
    ]
  >
>;

/** Compile-time law: the transport kinds stay derived and closed. */
export type TheTransportKindsAreDerivedAndClosed = Assert<
  Equal<WebTransportKind, 'fetch' | 'event-source' | 'readable-stream'>
>;

/** Type summary consumed by the web topology. */
export interface WebTransportTypeSurface {
  readonly connection: WebConnection;
  readonly decoder: CarrierDecoder;
  readonly request: TransportOpenRequest;
  readonly authority: TransportAuthority;
  readonly facility: TransportFacilityGrounding;
  readonly offer: TransportAuthorityOffer;
}

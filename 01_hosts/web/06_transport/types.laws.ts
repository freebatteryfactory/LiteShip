/**
 * Compile-time laws for `01_hosts/web/06_transport`.
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
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { StreamResumeRequest } from '../../../00_core/13_stream/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, OutputOf, Result, TagOf } from '../../../types.js';
import type { SinkPolicyRequirement } from '../02_security/types.js';
import type { BufferBound, CarrierDecodeContract, CarrierDecoder, TransportAuthority, TransportAuthorityOffer, TransportAuthorityRequirement, TransportFacilityRequirement, TransportOpenRequest, WebConnection, WebTransportKind } from './types.js';

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

/**
 * Compile-time laws for `01_hosts/edge/05_network`.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Result, Signature } from '../../../types.js';
import type { RequestMethod } from '../01_request/types.js';
import type { AllowedOrigin, EdgePolicyRequirement } from '../03_policy/types.js';
import type { EdgeBufferBound, EdgeEncodedChunk, EdgeNetworkAuthority, EdgeNetworkFacilityRequirement, EdgeNetworkOffer, EdgeOutboundConnection, OutboundConnectionReference, OutboundOpenRequest, OutboundRequestId, OutboundRequestReference } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Retry counts, timeouts, and connection reuse are empirical; that every
// open actually consults the policy on the shipping path is assurance.
// ---------------------------------------------------------------------------

/** Compile-time law: opening is decoder-correlated; one decoded family is not another. */
export type OutboundOpeningIsDecoderCorrelated = Assert<
  Equal<
    [
      EdgeNetworkAuthority['open'] extends (
        request: OutboundOpenRequest<string, OutboundRequestId<'liteship.edge.law.outbound-a'>>,
      ) => Result<
        EdgeOutboundConnection<string, OutboundRequestId<'liteship.edge.law.outbound-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      EdgeOutboundConnection<string, OutboundRequestId> extends EdgeOutboundConnection<
        Uint8Array,
        OutboundRequestId
      >
        ? true
        : false,
      EdgeOutboundConnection<string, OutboundRequestId<'liteship.edge.law.outbound-b'>> extends EdgeOutboundConnection<
        string,
        OutboundRequestId<'liteship.edge.law.outbound-a'>
      >
        ? true
        : false,
      OutboundOpenRequest<string, OutboundRequestId>['method'],
      OutboundOpenRequest<string, OutboundRequestId>['body'],
    ],
    [
      true,
      false,
      false,
      RequestMethod,
      ContentAddress<'application/vnd.liteship.edge-outbound-body+cbor'>,
    ]
  >
>;


/** Compile-time law: a connection is bounded, owned, origin-admitted, and can actually send. */
export type AConnectionIsBoundedOwnedAndAdmitted = Assert<
  Equal<
    [
      EdgeOutboundConnection<string, OutboundRequestId>['buffer'],
      EdgeOutboundConnection<string, OutboundRequestId>['lifecycle'],
      EdgeOutboundConnection<string, OutboundRequestId>['origin'],
      EdgeOutboundConnection<string, OutboundRequestId>['send'],
      EdgeOutboundConnection<string, OutboundRequestId<'liteship.edge.law.outbound-a'>>['request'],
    ],
    [
      EdgeBufferBound,
      CaseOf<RealizationLifecycle, 'owned'>,
      AllowedOrigin,
      Signature<EdgeEncodedChunk, OutboundConnectionReference, NonEmptyTuple<Diagnostic>>,
      OutboundRequestReference<OutboundRequestId<'liteship.edge.law.outbound-a'>>,
    ]
  >
>;


/** Compile-time law: the offer requires the policy — networking cannot stand alone. */
export type NetworkingRequiresThePolicy = Assert<
  Equal<
    EdgeNetworkOffer['requires'],
    readonly [EdgeNetworkFacilityRequirement, EdgePolicyRequirement]
  >
>;

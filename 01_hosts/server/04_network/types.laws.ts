/**
 * Compile-time laws for `01_hosts/server/04_network`.
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
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, OutputOf, Result, Signature } from '../../../types.js';
import type { AllowedEndpoint, ListenerResource, ServerConnectRequest, ServerConnection, ServerConnectionReference, ServerEncodedChunk, ServerNetworkAuthority, ServerNetworkFacility } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Timeout policy, socket buffers, and reuse are empirical; that every
// connect and listen consults the allowlist on the shipping path is
// assurance.
// ---------------------------------------------------------------------------

/** Compile-time law: connecting is decoder-correlated; one decoded family is not another. */
export type ConnectingIsDecoderCorrelated = Assert<
  Equal<
    [
      ServerNetworkAuthority['connect'] extends (
        request: ServerConnectRequest<string>,
      ) => Result<ServerConnection<string>, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      ServerConnection<string> extends ServerConnection<Uint8Array> ? true : false,
    ],
    [true, false]
  >
>;

/** Compile-time law: the intrinsic grounding carries the physical network operations. */
export type TheNetworkFacilityIsAnAuthorityNotAMarker = Assert<
  Equal<
    [ServerNetworkFacility['connect'], ServerNetworkFacility['listen']],
    [ServerNetworkAuthority['connect'], ServerNetworkAuthority['listen']]
  >
>;


/**
 * Compile-time law: connections send and receive, listeners accept usable
 * connections rather than bare references, and both are endpoint-admitted
 * and owned.
 */
export type ConnectionsAndListenersAreAdmittedAndOwned = Assert<
  Equal<
    [
      ServerConnection<string>['send'],
      OutputOf<ListenerResource['accept']>,
      ServerConnection<string>['endpoint'],
      ServerConnection<string>['lifecycle'],
      ListenerResource['lifecycle'],
    ],
    [
      Signature<ServerEncodedChunk, ServerConnectionReference, NonEmptyTuple<Diagnostic>>,
      readonly ServerConnection<Uint8Array>[],
      AllowedEndpoint,
      CaseOf<RealizationLifecycle, 'owned'>,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

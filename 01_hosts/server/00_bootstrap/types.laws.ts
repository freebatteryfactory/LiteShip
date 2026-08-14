/**
 * Compile-time laws for `01_hosts/server/00_bootstrap`.
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

import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { HostGroundingOrigin } from '../../types.js';
import type { ServerConfigurationGrounding, ServerEntryGrounding, ServerGroundingDefinition, ServerHostDefinition, ServerHostReference, ServerPlacedBackend, ServerRealizationOffer, ServerRealm, ServerSettlementLocation } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/** Compile-time law: the server realm is exactly the server realm. */
export type ServerRealmIsExactlyTheServerRealm = Assert<Equal<ServerRealm, 'server'>>;


/** Compile-time law: a server grounding slot cannot claim another realm. */
export type AServerGroundingIsPinnedToTheServerRealm = Assert<
  Equal<ServerGroundingDefinition['realm'], 'server'>
>;


/** Compile-time law: the server definition and its catalog share one identity and realm. */
export type TheServerDefinitionSharesItsCatalogIdentity = Assert<
  Equal<
    [ServerHostDefinition['catalog']['host'], ServerHostDefinition['catalog']['realm']],
    [ServerHostReference, 'server']
  >
>;


/**
 * Compile-time law: a server offer cannot advertise another placement — the
 * backends are exactly javascript, wasm, and host-native, and the locations
 * are exactly local and live.
 */
export type AServerOfferCannotAdvertiseAnotherPlacement = Assert<
  Equal<
    [
      ServerRealizationOffer['realms'],
      ServerPlacedBackend,
      ServerSettlementLocation,
      'webgpu' extends ServerPlacedBackend ? true : false,
    ],
    [NonEmptyTuple<'server'>, 'javascript' | 'wasm' | 'host-native', 'local' | 'live', false]
  >
>;


/** Compile-time law: the entry groundings pin their origins and custody. */
export type TheServerEntryPinsItsOrigins = Assert<
  Equal<
    [
      ServerEntryGrounding['origin'],
      ServerConfigurationGrounding['origin'],
      ServerEntryGrounding['custody'],
    ],
    [CaseOf<HostGroundingOrigin, 'invocation'>, CaseOf<HostGroundingOrigin, 'deployment'>, 'unowned']
  >
>;

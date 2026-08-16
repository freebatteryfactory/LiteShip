/**
 * Compile-time laws for `01_hosts/edge/00_bootstrap`.
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
import type { EdgeDeploymentGrounding, EdgeGroundingDefinition, EdgeHostDefinition, EdgeHostReference, EdgeInvocationGrounding, EdgePlacedBackend, EdgeRealizationOffer, EdgeSettlementLocation } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/** Compile-time law: an edge grounding slot cannot claim another realm. */
export type AnEdgeGroundingIsPinnedToTheEdgeRealm = Assert<
  Equal<EdgeGroundingDefinition['realm'], 'edge'>
>;


/** Compile-time law: the edge definition and its catalog share one identity and realm. */
export type TheEdgeDefinitionSharesItsCatalogIdentity = Assert<
  Equal<
    [EdgeHostDefinition['catalog']['host'], EdgeHostDefinition['catalog']['realm']],
    [EdgeHostReference, 'edge']
  >
>;


/**
 * Compile-time law: an edge offer cannot advertise another placement — the
 * location is exactly request-time and the backends exclude webgpu, server,
 * host-native, sibling realms, and html-css.
 */
export type AnEdgeOfferCannotAdvertiseAnotherPlacement = Assert<
  Equal<
    [
      EdgeRealizationOffer['realms'],
      EdgePlacedBackend,
      EdgeSettlementLocation,
      'local' extends EdgeSettlementLocation ? true : false,
    ],
    [NonEmptyTuple<'edge'>, 'javascript' | 'wasm', 'request', false]
  >
>;


/** Compile-time law: the entry groundings pin their origins and custody. */
export type TheEdgeEntryPinsItsOrigins = Assert<
  Equal<
    [EdgeInvocationGrounding['origin'], EdgeDeploymentGrounding['origin'], EdgeInvocationGrounding['custody']],
    [CaseOf<HostGroundingOrigin, 'invocation'>, CaseOf<HostGroundingOrigin, 'deployment'>, 'unowned']
  >
>;

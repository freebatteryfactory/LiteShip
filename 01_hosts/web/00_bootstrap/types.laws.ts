/**
 * Compile-time laws for `01_hosts/web/00_bootstrap`.
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

import type { Assert, CaseOf, Equal, Hole, NonEmptyTuple } from '../../../types.js';
import type { HostGroundingOrigin } from '../../types.js';
import type { WebGroundingDefinition, WebHostDefinition, WebHostReference, WebPlacedBackend, WebRealizationOffer, WebSettlementLocation } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That the bootstrap captures globals only beneath this boundary, that no
// module performs ambient browser reads, and that the declared slot population
// matches the actual entrypoint surface are `system/assurance` obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: a web grounding slot cannot claim another realm. */
export type AWebGroundingIsPinnedToTheWebRealm = Assert<
  Equal<WebGroundingDefinition['realm'], 'web'>
>;


/** Compile-time law: the web definition and its catalog share one identity and realm. */
export type TheWebDefinitionSharesItsCatalogIdentity = Assert<
  Equal<
    [WebHostDefinition['catalog']['host'], WebHostDefinition['catalog']['realm']],
    [WebHostReference, 'web']
  >
>;


/**
 * Compile-time law: a web offer cannot advertise another realm or an unowned
 * placement. The residual backends are exactly javascript, wasm, and webgpu —
 * no server, no host-native, no sibling worker realm, and no `html-css`,
 * which settled at the platform before residual execution began. The
 * settlement locations are exactly local, live, and remote — remote included,
 * because web realizes the remote-evidence transport.
 */
export type AWebOfferCannotAdvertiseAnotherPlacement = Assert<
  Equal<
    [
      WebRealizationOffer['realms'],
      WebPlacedBackend,
      WebSettlementLocation,
      'html-css' extends WebPlacedBackend ? true : false,
    ],
    [NonEmptyTuple<'web'>, 'javascript' | 'wasm' | 'webgpu', 'local' | 'live' | 'remote', false]
  >
>;


/** Compile-time law: a grounding slot pins its allowed origin and exact custody arm. */
export type AGroundingSlotPinsItsOriginAndCustody = Assert<
  Equal<
    [
      WebGroundingDefinition<readonly [ExampleBootRequirement], unknown, 'intrinsic', 'unowned'>['origin'],
      WebGroundingDefinition<readonly [ExampleBootRequirement], unknown, 'intrinsic', 'unowned'>['custody'],
    ],
    [CaseOf<HostGroundingOrigin, 'intrinsic'>, 'unowned']
  >
>;


type ExampleBootRequirement = Hole<'liteship.example.web-boot', { readonly use: () => void }>;

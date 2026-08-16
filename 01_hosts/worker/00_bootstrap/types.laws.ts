/**
 * Compile-time laws for `01_hosts/worker/00_bootstrap`.
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

import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { RealizationCatalogAddress } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { HostGroundingOrigin } from '../../types.js';
import type { BootstrapEnvelopeGrounding, RealmScopeGrounding, WorkerBootstrapEnvelope, WorkerGroundingDefinition, WorkerHostDefinition, WorkerHostReference, WorkerPlacedBackend, WorkerRealizationOffer, WorkerSettlementLocation } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That raw realm globals are captured only beneath this boundary, that no
// module performs ambient reads, and that every target-generated worker
// artifact enters through this canonical bootstrap are `system/assurance`
// obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: a worker grounding slot cannot claim another realm. */
export type AWorkerGroundingIsPinnedToTheWorkerRealm = Assert<
  Equal<WorkerGroundingDefinition['realm'], 'worker'>
>;


/** Compile-time law: the worker definition and its catalog share one identity and realm. */
export type TheWorkerDefinitionSharesItsCatalogIdentity = Assert<
  Equal<
    [WorkerHostDefinition['catalog']['host'], WorkerHostDefinition['catalog']['realm']],
    [WorkerHostReference, 'worker']
  >
>;


/**
 * Compile-time law: a worker offer cannot advertise another placement. The
 * initial-profile backends are exactly javascript and wasm — no webgpu by
 * default, no server, no host-native, no sibling realm, no html-css — and the
 * locations are exactly local and live.
 */
export type AWorkerOfferCannotAdvertiseAnotherPlacement = Assert<
  Equal<
    [
      WorkerRealizationOffer['realms'],
      WorkerPlacedBackend,
      WorkerSettlementLocation,
      'webgpu' extends WorkerPlacedBackend ? true : false,
    ],
    [NonEmptyTuple<'worker'>, 'javascript' | 'wasm', 'local' | 'live', false]
  >
>;


/** Compile-time law: a grounding slot pins its allowed origin and exact custody arm. */
export type AWorkerSlotPinsItsOriginAndCustody = Assert<
  Equal<
    [
      RealmScopeGrounding['origin'],
      RealmScopeGrounding['custody'],
      BootstrapEnvelopeGrounding['origin'],
    ],
    [CaseOf<HostGroundingOrigin, 'intrinsic'>, 'unowned', CaseOf<HostGroundingOrigin, 'invocation'>]
  >
>;


/** Compile-time law: the envelope binds program, catalog, and generation — no naked entry. */
export type TheEnvelopeCarriesItsExactEntry = Assert<
  Equal<
    [
      WorkerBootstrapEnvelope['program'],
      WorkerBootstrapEnvelope['catalog'],
      WorkerBootstrapEnvelope['generation'],
    ],
    [
      ContentAddress<'application/vnd.liteship.program+cbor'>,
      RealizationCatalogAddress,
      TransactionGeneration,
    ]
  >
>;

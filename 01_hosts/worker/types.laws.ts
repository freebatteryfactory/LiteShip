/**
 * Compile-time laws for `01_hosts/worker`.
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

import type { GroundingId, RealizationOfferId } from '../../00_core/14_compiler/types.js';
import type { Assert, Equal, InputOf, TagOf } from '../../types.js';
import type { RealizationCatalog } from '../types.js';
import type { RealmScopeFacility, WorkerBootstrapTypeSurface } from './00_bootstrap/types.js';
import type { WorkerInstanceTypeSurface } from './01_instance/types.js';
import type { MessageFacility, MessagingAuthority, WorkerMessageTypeSurface } from './02_message/types.js';
import type { CustodyMode, TransferFacility, TransferTicket, WorkerTransferTypeSurface } from './03_transfer/types.js';
import type { MemoryLayoutId, SharedBufferId, SharedMemoryBuffer, SharedMemoryFacility, WorkerMemoryTypeSurface } from './04_memory/types.js';
import type { WorkerQueueTypeSurface } from './05_queue/types.js';
import type { WorkerExecutionHost, WorkerExecutionTypeSurface, WorkerSchedulingFacility } from './06_execution/types.js';
import type { WorkerCapabilityTopology, WorkerTypeAt, WorkerTypeTopology } from './types.js';


// ---------------------------------------------------------------------------
// Laws
//
// That the roster, order, and surfaces agree with the physical tree, and that
// the erased catalog faithfully derives from these declarations, are
// `system/assurance` comparisons against the repository.
// ---------------------------------------------------------------------------

/** Compile-time law: the topology is ordered — position by position, exactly. */
export type TheWorkerTopologyIsOrderedExactly = Assert<
  Equal<
    [
      WorkerTypeTopology[0]['name'],
      WorkerTypeTopology[1]['name'],
      WorkerTypeTopology[2]['name'],
      WorkerTypeTopology[3]['name'],
      WorkerTypeTopology[4]['name'],
      WorkerTypeTopology[5]['name'],
      WorkerTypeTopology[6]['name'],
    ],
    ['00_bootstrap', '01_instance', '02_message', '03_transfer', '04_memory', '05_queue', '06_execution']
  >
>;


/** Compile-time law: every home resolves to its own surface — no swap can hide. */
export type EachWorkerHomeResolvesToItsOwnSurface = Assert<
  Equal<
    [
      WorkerTypeAt<'00_bootstrap'>,
      WorkerTypeAt<'01_instance'>,
      WorkerTypeAt<'02_message'>,
      WorkerTypeAt<'03_transfer'>,
      WorkerTypeAt<'04_memory'>,
      WorkerTypeAt<'05_queue'>,
      WorkerTypeAt<'06_execution'>,
    ],
    [
      WorkerBootstrapTypeSurface,
      WorkerInstanceTypeSurface,
      WorkerMessageTypeSurface,
      WorkerTransferTypeSurface,
      WorkerMemoryTypeSurface,
      WorkerQueueTypeSurface,
      WorkerExecutionTypeSurface,
    ]
  >
>;


/** Compile-time law: the grounding population is exact — a slot cannot vanish. */
export type TheWorkerGroundingPopulationIsExact = Assert<
  Equal<
    keyof WorkerCapabilityTopology['groundings'],
    | 'realmScope'
    | 'bootstrapEnvelope'
    | 'messageFacility'
    | 'transferFacility'
    | 'sharedMemoryFacility'
    | 'schedulingFacility'
  >
>;

/**
 * Compile-time law: only the parent-written bootstrap envelope enters as raw
 * hostile data; every other worker grounding admits its exact realm facility.
 */
export type EveryWorkerGroundingAdmitsItsExactSuppliedInput = Assert<
  Equal<
    [
      InputOf<WorkerCapabilityTopology['groundings']['realmScope']['admit']>,
      InputOf<WorkerCapabilityTopology['groundings']['bootstrapEnvelope']['admit']>,
      InputOf<WorkerCapabilityTopology['groundings']['messageFacility']['admit']>,
      InputOf<WorkerCapabilityTopology['groundings']['transferFacility']['admit']>,
      InputOf<WorkerCapabilityTopology['groundings']['sharedMemoryFacility']['admit']>,
      InputOf<WorkerCapabilityTopology['groundings']['schedulingFacility']['admit']>,
    ],
    [
      RealmScopeFacility,
      unknown,
      MessageFacility,
      TransferFacility,
      SharedMemoryFacility,
      WorkerSchedulingFacility,
    ]
  >
>;


/** Compile-time law: the offer population is exact — an offer cannot vanish. */
export type TheWorkerOfferPopulationIsExact = Assert<
  Equal<
    keyof WorkerCapabilityTopology['offers'],
    | 'messagingAuthority'
    | 'transferAuthority'
    | 'sharedMemoryAuthority'
    | 'queueAuthority'
    | 'executionHost'
  >
>;


/** Compile-time law: the topology carries its erased catalog beside the typed rosters. */
export type TheWorkerTopologyCarriesItsErasedCatalog = Assert<
  Equal<WorkerCapabilityTopology['erased'], RealizationCatalog>
>;


/**
 * Compile-time law: every declaration pins its exact identity — all six
 * grounding slots and all five offers, eleven pinned capability
 * declarations, so no two worker declarations can silently collide and none
 * can borrow another's identity string.
 */
export type EveryWorkerDeclarationPinsItsExactIdentity = Assert<
  Equal<
    [
      WorkerCapabilityTopology['groundings']['realmScope']['id'],
      WorkerCapabilityTopology['groundings']['bootstrapEnvelope']['id'],
      WorkerCapabilityTopology['groundings']['messageFacility']['id'],
      WorkerCapabilityTopology['groundings']['transferFacility']['id'],
      WorkerCapabilityTopology['groundings']['sharedMemoryFacility']['id'],
      WorkerCapabilityTopology['groundings']['schedulingFacility']['id'],
      WorkerCapabilityTopology['offers']['messagingAuthority']['id'],
      WorkerCapabilityTopology['offers']['transferAuthority']['id'],
      WorkerCapabilityTopology['offers']['sharedMemoryAuthority']['id'],
      WorkerCapabilityTopology['offers']['queueAuthority']['id'],
      WorkerCapabilityTopology['offers']['executionHost']['id'],
    ],
    [
      GroundingId<'liteship.worker.grounding.realm-scope'>,
      GroundingId<'liteship.worker.grounding.bootstrap-envelope'>,
      GroundingId<'liteship.worker.grounding.message-facility'>,
      GroundingId<'liteship.worker.grounding.transfer-facility'>,
      GroundingId<'liteship.worker.grounding.shared-memory-facility'>,
      GroundingId<'liteship.worker.grounding.scheduling-facility'>,
      RealizationOfferId<'liteship.worker.offer.messaging-authority'>,
      RealizationOfferId<'liteship.worker.offer.transfer-authority'>,
      RealizationOfferId<'liteship.worker.offer.shared-memory-authority'>,
      RealizationOfferId<'liteship.worker.offer.queue-authority'>,
      RealizationOfferId<'liteship.worker.offer.execution-host'>,
    ]
  >
>;


/**
 * Compile-time law: load-bearing surface members stay their declared types —
 * a surface cannot quietly blur its messaging authority, custody ticket,
 * shared buffer, or execution host to `unknown` while the whole-surface
 * comparison stays trivially green.
 */
export type WorkerSurfacesCarryTheirDeclaredMembers = Assert<
  Equal<
    [
      WorkerTypeAt<'02_message'>['authority'],
      WorkerTypeAt<'03_transfer'>['ticket'],
      WorkerTypeAt<'04_memory'>['buffer'],
      WorkerTypeAt<'06_execution'>['host'],
    ],
    [
      MessagingAuthority,
      TransferTicket<TagOf<CustodyMode>>,
      SharedMemoryBuffer<MemoryLayoutId, SharedBufferId>,
      WorkerExecutionHost,
    ]
  >
>;

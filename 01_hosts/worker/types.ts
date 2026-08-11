/**
 * Worker: the isolated-execution realm's semantic topology.
 *
 * Seven numbered homes in dependency order, one inspectable capability
 * composition, and the exact identity gate over every declared grounding and
 * offer. Worker owns isolation, transfer custody, shared memory, bounded
 * queues, and worker-local execution; it owns no semantic engine, no sibling
 * realm's surface, and no parent-side constructor.
 *
 * @module
 */

import type { Assert, Equal, Named, TagOf, Tuple } from '../../types.js';
import type { GroundingId, RealizationOfferId } from '../../00_core/14_compiler/types.js';
import type { RealizationCatalog } from '../types.js';
import type {
  BootstrapEnvelopeGrounding,
  RealmScopeGrounding,
  WorkerBootstrapTypeSurface,
} from './00_bootstrap/types.js';
import type { WorkerInstanceTypeSurface } from './01_instance/types.js';
import type {
  MessageFacilityGrounding,
  MessagingAuthority,
  MessagingAuthorityOffer,
  WorkerMessageTypeSurface,
} from './02_message/types.js';
import type {
  CustodyMode,
  TransferAuthorityOffer,
  TransferFacilityGrounding,
  TransferTicket,
  WorkerTransferTypeSurface,
} from './03_transfer/types.js';
import type {
  MemoryLayoutId,
  SharedBufferId,
  SharedMemoryBuffer,
  SharedMemoryFacilityGrounding,
  SharedMemoryOffer,
  WorkerMemoryTypeSurface,
} from './04_memory/types.js';
import type { QueueAuthorityOffer, WorkerQueueTypeSurface } from './05_queue/types.js';
import type {
  WorkerExecutionHost,
  WorkerExecutionOffer,
  WorkerExecutionTypeSurface,
  WorkerSchedulingGrounding,
} from './06_execution/types.js';

/** The seven worker homes, in numbered dependency order. */
export type WorkerHomeName =
  | '00_bootstrap'
  | '01_instance'
  | '02_message'
  | '03_transfer'
  | '04_memory'
  | '05_queue'
  | '06_execution';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface WorkerTypeHome<Name extends WorkerHomeName, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete ordered worker type waterfall. */
export type WorkerTypeTopology = Tuple<[
  WorkerTypeHome<'00_bootstrap', WorkerBootstrapTypeSurface>,
  WorkerTypeHome<'01_instance', WorkerInstanceTypeSurface>,
  WorkerTypeHome<'02_message', WorkerMessageTypeSurface>,
  WorkerTypeHome<'03_transfer', WorkerTransferTypeSurface>,
  WorkerTypeHome<'04_memory', WorkerMemoryTypeSurface>,
  WorkerTypeHome<'05_queue', WorkerQueueTypeSurface>,
  WorkerTypeHome<'06_execution', WorkerExecutionTypeSurface>
]>;

/** Select one owner surface by its source-home name. */
export type WorkerTypeAt<Name extends WorkerHomeName> = Extract<
  WorkerTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * The inspectable worker capability composition: every declared grounding
 * slot and every declared offer, by owning home, plus the erased catalog
 * derived from them.
 */
export interface WorkerCapabilityTopology {
  readonly groundings: {
    readonly realmScope: RealmScopeGrounding;
    readonly bootstrapEnvelope: BootstrapEnvelopeGrounding;
    readonly messageFacility: MessageFacilityGrounding;
    readonly transferFacility: TransferFacilityGrounding;
    readonly sharedMemoryFacility: SharedMemoryFacilityGrounding;
    readonly schedulingFacility: WorkerSchedulingGrounding;
  };
  readonly offers: {
    readonly messagingAuthority: MessagingAuthorityOffer;
    readonly transferAuthority: TransferAuthorityOffer;
    readonly sharedMemoryAuthority: SharedMemoryOffer;
    readonly queueAuthority: QueueAuthorityOffer;
    readonly executionHost: WorkerExecutionOffer;
  };
  readonly erased: RealizationCatalog;
}

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

/** Compile-time law: the roster and the tuple carry the same population. */
export type TheWorkerRosterAndTupleAgree = Assert<
  Equal<WorkerTypeTopology[number]['name'], WorkerHomeName>
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

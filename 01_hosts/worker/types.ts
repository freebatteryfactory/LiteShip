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

import type {
  Named,
  Tuple,
} from '../../types.js';

import type { RealizationCatalog } from '../types.js';
import type {
  BootstrapEnvelopeGrounding,
  RealmScopeGrounding,
  WorkerBootstrapTypeSurface,
} from './00_bootstrap/types.js';
import type { WorkerInstanceTypeSurface } from './01_instance/types.js';
import type {
  MessageFacilityGrounding,
  MessagingAuthorityOffer,
  WorkerMessageTypeSurface,
} from './02_message/types.js';
import type {
  TransferAuthorityOffer,
  TransferFacilityGrounding,
  WorkerTransferTypeSurface,
} from './03_transfer/types.js';
import type {
  SharedMemoryFacilityGrounding,
  SharedMemoryOffer,
  WorkerMemoryTypeSurface,
} from './04_memory/types.js';
import type { QueueAuthorityOffer, WorkerQueueTypeSurface } from './05_queue/types.js';
import type {
  WorkerExecutionOffer,
  WorkerExecutionTypeSurface,
  WorkerSchedulingGrounding,
} from './06_execution/types.js';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface WorkerTypeHome<Name extends string, Surface> extends Named<Name> {
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

/**
 * Stable source-home names in numbered dependency order.
 *
 * Derived from the topology. A hand-written union beside a hand-written tuple
 * is one population twice, and the law that compared them was a confession
 * rather than a proof.
 */
export type WorkerHomeName = WorkerTypeTopology[number]['name'];

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

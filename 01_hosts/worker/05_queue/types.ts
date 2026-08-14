/**
 * Bounded queues over shared memory: SPSC resources with exact roles.
 *
 * This home owns repeatable bounded-queue resources: producer and consumer
 * endpoint identities, slot generations, admission, overflow policy shape,
 * backpressure, batch identity, stale-result rejection, cancellation,
 * closure, and disposal. Exact capacity, padding, polling, wait,
 * notification, and batching thresholds are empirical implementation
 * decisions — the architecture defines the decision points, never the
 * numbers.
 *
 * A queue has exactly one producer endpoint and exactly one consumer
 * endpoint, each pinned to its role — an erased role union would let one side
 * silently hold both, which is the defect SPSC exists to make
 * unrepresentable.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  InputOf,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { SchemaId, SchemaReference } from '../../../00_core/03_schema/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { WorkerRealizationOffer } from '../00_bootstrap/types.js';
import type { SharedBufferId, SharedBufferReference, SharedMemoryRequirement } from '../04_memory/types.js';

export type QueueId<Name extends string = string> = Brand<Name, 'liteship.worker.queue-id'>;
export type QueueReference<Id extends QueueId = QueueId> = Reference<'worker-queue', Id>;
export type QueueBatchId = Brand<string, 'liteship.worker.queue-batch-id'>;

/** The two SPSC endpoint roles. One queue has exactly one of each. */
export type QueueEndpointRole = 'producer' | 'consumer';

/** One role-pinned endpoint of one exact queue — no default erases the identity. */
export interface QueueEndpoint<Role extends QueueEndpointRole, Id extends QueueId> {
  readonly queue: QueueReference<Id>;
  readonly role: Role;
}

/** Overflow policy shape: refuse the item or apply backpressure. No constants. */
export type OverflowPolicy = Algebra<{
  refuse: Record<never, never>;
  backpressure: Record<never, never>;
}>;

/** One admitted batch: the exact queue it belongs to, its identity, and its generation. */
export interface QueueBatch<Payload, Id extends QueueId> {
  readonly queue: QueueReference<Id>;
  readonly id: QueueBatchId;
  readonly generation: TransactionGeneration;
  readonly items: NonEmptyTuple<Payload>;
}

/**
 * One live bounded queue: a per-use owned resource over an exact shared
 * buffer, with an admission contract for its payload, one producer, one
 * consumer, and a declared overflow policy. Stale batches are rejected by
 * generation — a consumer never applies a batch from a superseded
 * transaction coordinate.
 */
export interface BoundedQueue<Payload, Id extends QueueId, Buf extends SharedBufferId> {
  readonly id: QueueReference<Id>;
  readonly buffer: SharedBufferReference<Buf>;
  readonly admission: SchemaReference<SchemaId, Payload>;
  readonly policy: OverflowPolicy;
  readonly producer: QueueEndpoint<'producer', Id>;
  readonly consumer: QueueEndpoint<'consumer', Id>;
  readonly enqueue: Signature<QueueBatch<Payload, Id>, QueueBatchId, NonEmptyTuple<Diagnostic>>;
  readonly dequeue: Signature<
    TransactionGeneration,
    readonly QueueBatch<Payload, Id>[],
    NonEmptyTuple<Diagnostic>
  >;
  readonly closeQueue: Signature<QueueReference<Id>, TransactionGeneration, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete construction request: exact queue identity, buffer, admission, and policy. */
export interface QueueRequest<Payload, Id extends QueueId, Buf extends SharedBufferId> {
  readonly queue: QueueReference<Id>;
  readonly buffer: SharedBufferReference<Buf>;
  readonly admission: SchemaReference<SchemaId, Payload>;
  readonly policy: OverflowPolicy;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * The queue provider: queues are repeatable per-use resources it constructs
 * over the shared-memory provider — two queues are two values with two
 * lifecycles, never one deduplicated hole.
 */
export interface QueueAuthority {
  readonly construct: <Payload, Id extends QueueId, Buf extends SharedBufferId>(
    request: QueueRequest<Payload, Id, Buf>,
  ) => Result<BoundedQueue<Payload, Id, Buf>, NonEmptyTuple<Diagnostic>>;
}

export type QueueRequirement = Hole<'liteship.worker.queue', QueueAuthority>;

/** Constructing the queue provider: it builds over the shared-memory provider. */
export interface QueueAuthorityOffer
  extends WorkerRealizationOffer<
    readonly [QueueRequirement],
    readonly [SharedMemoryRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.worker.offer.queue-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript' | 'wasm'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// SPSC role exclusivity and atomic-order correctness at runtime are
// `system/assurance` obligations; capacities and wait policies are empirical.
// ---------------------------------------------------------------------------

/**
 * Compile-time law: producer and consumer are distinct pinned roles on the
 * exact queue that owns them — queue A cannot hold an endpoint of queue B,
 * and no erased union side exists.
 */
export type TheEndpointsPinTheirRoles = Assert<
  Equal<
    [
      BoundedQueue<CanonicalValue, QueueId<'liteship.worker.law.queue-a'>, SharedBufferId>['producer']['queue'],
      BoundedQueue<CanonicalValue, QueueId, SharedBufferId>['producer']['role'],
      BoundedQueue<CanonicalValue, QueueId, SharedBufferId>['consumer']['role'],
      QueueEndpoint<'producer', QueueId> extends QueueEndpoint<'consumer', QueueId> ? true : false,
      QueueEndpoint<'producer', QueueId<'liteship.worker.law.queue-b'>> extends QueueEndpoint<
        'producer',
        QueueId<'liteship.worker.law.queue-a'>
      >
        ? true
        : false,
    ],
    [QueueReference<QueueId<'liteship.worker.law.queue-a'>>, 'producer', 'consumer', false, false]
  >
>;

/** Compile-time law: construction is payload-correlated through the admission contract. */
export type ConstructionIsPayloadCorrelated = Assert<
  Equal<
    [
      QueueAuthority['construct'] extends (
        request: QueueRequest<
          string,
          QueueId<'liteship.worker.law.queue-a'>,
          SharedBufferId<'liteship.worker.law.buffer-a'>
        >,
      ) => Result<
        BoundedQueue<
          string,
          QueueId<'liteship.worker.law.queue-a'>,
          SharedBufferId<'liteship.worker.law.buffer-a'>
        >,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      BoundedQueue<string, QueueId, SharedBufferId> extends BoundedQueue<Uint8Array, QueueId, SharedBufferId>
        ? true
        : false,
      BoundedQueue<string, QueueId, SharedBufferId<'liteship.worker.law.buffer-b'>> extends BoundedQueue<
        string,
        QueueId,
        SharedBufferId<'liteship.worker.law.buffer-a'>
      >
        ? true
        : false,
    ],
    [true, false, false]
  >
>;

/**
 * Compile-time law: a batch belongs to exactly one queue — queue A cannot
 * accept a batch naming queue B, and dequeue yields only this queue's
 * batches.
 */
export type ABatchBelongsToExactlyOneQueue = Assert<
  Equal<
    [
      QueueBatch<string, QueueId<'liteship.worker.law.queue-a'>>['queue'],
      QueueBatch<string, QueueId<'liteship.worker.law.queue-b'>> extends QueueBatch<
        string,
        QueueId<'liteship.worker.law.queue-a'>
      >
        ? true
        : false,
      InputOf<BoundedQueue<string, QueueId<'liteship.worker.law.queue-a'>, SharedBufferId>['enqueue']>,
    ],
    [
      QueueReference<QueueId<'liteship.worker.law.queue-a'>>,
      false,
      QueueBatch<string, QueueId<'liteship.worker.law.queue-a'>>,
    ]
  >
>;

/** Compile-time law: a batch carries its identity and generation, and dequeue is generation-aware. */
export type BatchesCarryTheirGeneration = Assert<
  Equal<
    [
      QueueBatch<CanonicalValue, QueueId>['generation'],
      BoundedQueue<CanonicalValue, QueueId, SharedBufferId>['dequeue'],
    ],
    [
      TransactionGeneration,
      Signature<
        TransactionGeneration,
        readonly QueueBatch<CanonicalValue, QueueId>[],
        NonEmptyTuple<Diagnostic>
      >,
    ]
  >
>;

/** Compile-time law: a queue is bounded by declared policy and owned exactly once. */
export type AQueueIsBoundedAndOwned = Assert<
  Equal<
    [
      BoundedQueue<CanonicalValue, QueueId, SharedBufferId>['policy'],
      BoundedQueue<CanonicalValue, QueueId, SharedBufferId>['lifecycle'],
      TagOf<OverflowPolicy>,
    ],
    [OverflowPolicy, CaseOf<RealizationLifecycle, 'owned'>, 'refuse' | 'backpressure']
  >
>;

/** Type summary consumed by the worker topology. */
export interface WorkerQueueTypeSurface {
  readonly queue: BoundedQueue<CanonicalValue, QueueId, SharedBufferId>;
  readonly batch: QueueBatch<CanonicalValue, QueueId>;
  readonly authority: QueueAuthority;
  readonly queueOffer: QueueAuthorityOffer;
}

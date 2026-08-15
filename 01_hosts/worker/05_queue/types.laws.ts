/**
 * Compile-time laws for `01_hosts/worker/05_queue`.
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
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, InputOf, NonEmptyTuple, OutputOf, Result, Signature, TagOf } from '../../../types.js';
import type { SharedBufferId } from '../04_memory/types.js';
import type { BoundedQueue, OverflowPolicy, QueueAuthority, QueueBatch, QueueCloseReceipt, QueueEndpoint, QueueId, QueueReference, QueueRequest } from './types.js';

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


/** Compile-time law: closing finalizes one exact queue and returns its terminal generation. */
export type QueueCloseIsFinalizationNotDisposal = Assert<
  Equal<
    OutputOf<
      BoundedQueue<
        CanonicalValue,
        QueueId<'liteship.worker.law.queue-a'>,
        SharedBufferId
      >['closeQueue']
    >,
    QueueCloseReceipt<QueueId<'liteship.worker.law.queue-a'>>
  >
>;

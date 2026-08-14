/**
 * Compile-time laws for `01_hosts/worker/01_instance`.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Signature, TagOf } from '../../../types.js';
import type { WorkerBootstrapEnvelope } from '../00_bootstrap/types.js';
import type { WorkerInstance, WorkerInstanceId, WorkerInstanceReference, WorkerLifecycleState } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That disposal happens exactly once, that crash and withdrawal produce
// correct evidence and receipts, and that actual parent termination is
// distinguishable from close at runtime are `system/assurance` obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: the lifecycle arms are exactly the declared set. */
export type TheLifecycleArmsAreExact = Assert<
  Equal<
    TagOf<WorkerLifecycleState>,
    'admitted' | 'ready' | 'closing' | 'closed' | 'terminated' | 'crashed' | 'withdrawn'
  >
>;


/** Compile-time law: a crash carries evidence; a graceful close carries its receipt. */
export type CrashAndCloseCarryTheirEvidence = Assert<
  Equal<
    [
      CaseOf<WorkerLifecycleState, 'crashed'>['diagnostics'],
      CaseOf<WorkerLifecycleState, 'closed'>['receipt'],
    ],
    [NonEmptyTuple<Diagnostic>, ContentAddress<'application/vnd.liteship.worker-close+cbor'>]
  >
>;


/** Compile-time law: the instance is owned and its entry is the exact bootstrap envelope. */
export type TheInstanceOwnsItsEntry = Assert<
  Equal<
    [WorkerInstance<WorkerInstanceId>['lifecycle'], WorkerInstance<WorkerInstanceId>['entry']],
    [CaseOf<RealizationLifecycle, 'owned'>, WorkerBootstrapEnvelope]
  >
>;


/**
 * Compile-time law: an instance closes exactly itself — instance A's close
 * accepts only instance A's reference, and an instance of B is not an
 * instance of A.
 */
export type AnInstanceClosesExactlyItself = Assert<
  Equal<
    [
      WorkerInstance<WorkerInstanceId<'liteship.worker.law.instance-a'>>['close'],
      WorkerInstance<WorkerInstanceId<'liteship.worker.law.instance-b'>> extends WorkerInstance<
        WorkerInstanceId<'liteship.worker.law.instance-a'>
      >
        ? true
        : false,
    ],
    [
      Signature<
        WorkerInstanceReference<WorkerInstanceId<'liteship.worker.law.instance-a'>>,
        ContentAddress<'application/vnd.liteship.worker-close+cbor'>,
        NonEmptyTuple<Diagnostic>
      >,
      false,
    ]
  >
>;

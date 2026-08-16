/**
 * Compile-time laws for `01_hosts/worker/06_execution`.
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
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { ExecutionRequest, RuntimeCommit, RuntimeExecutor } from '../../../00_core/16_runtime/types.js';
import type { Assert, CaseOf, Equal, InputOf, NonEmptyTuple, OutputOf, Result, Signature } from '../../../types.js';
import type { BoundWorkerDriver, ExecutionResultEnvelope, WorkerExecutionHost, WorkerExecutionRequest, WorkerExecutionSession, WorkerSchedulingFacility, WorkerTaskId, WorkerTaskReference } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Parity against the reference backend on the shipping path, and complete
// end-to-end cost accounting including startup, transfer, synchronization,
// commit, and disposal, are `system/assurance` and empirical obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: a backend and its driver cannot disagree — distributively. */
export type AWorkerBackendAndItsDriverCannotDisagree = Assert<
  Equal<
    Extract<BoundWorkerDriver, { readonly backend: 'javascript' }>['driver']['kind'],
    'javascript'
  >
>;


/** Compile-time law: the worker host carries core's runtime execution contract exactly. */
export type TheWorkerHostCarriesTheRuntimeExecutionContract = Assert<
  Equal<
    [WorkerExecutionHost['executor'], OutputOf<RuntimeExecutor['execute']>],
    [RuntimeExecutor, RuntimeCommit]
  >
>;


/** Compile-time law: scheduling schedules before execution — never a commit identity. */
export type WorkerSchedulingSchedulesBeforeExecution = Assert<
  Equal<
    [InputOf<WorkerSchedulingFacility['schedule']>, OutputOf<WorkerSchedulingFacility['schedule']>],
    [ExecutionRequest, ExecutionRequest]
  >
>;


/**
 * Compile-time law: a result names its exact session and generation and
 * leaves as the real commit on a named channel — an envelope of session B
 * is not an envelope of session A, and a session's result yields its own
 * envelope.
 */
export type AResultLeavesAsTheRealCommit = Assert<
  Equal<
    [
      ExecutionResultEnvelope<WorkerTaskId<'liteship.worker.law.task-a'>>['session'],
      ExecutionResultEnvelope<WorkerTaskId>['generation'],
      ExecutionResultEnvelope<WorkerTaskId>['commit'],
      ExecutionResultEnvelope<WorkerTaskId<'liteship.worker.law.task-b'>> extends ExecutionResultEnvelope<
        WorkerTaskId<'liteship.worker.law.task-a'>
      >
        ? true
        : false,
      WorkerExecutionSession<WorkerTaskId<'liteship.worker.law.task-a'>>['result'],
    ],
    [
      WorkerTaskReference<WorkerTaskId<'liteship.worker.law.task-a'>>,
      TransactionGeneration,
      RuntimeCommit,
      false,
      Signature<
        WorkerTaskReference<WorkerTaskId<'liteship.worker.law.task-a'>>,
        ExecutionResultEnvelope<WorkerTaskId<'liteship.worker.law.task-a'>>,
        NonEmptyTuple<Diagnostic>
      >,
    ]
  >
>;


/**
 * Compile-time law: beginning is task-correlated through the provider's
 * generic operation — beginning task A yields a session of exactly task A,
 * whose id is the exact reference — sessions are self-correlated (session B
 * is not session A) and owned.
 */
export type ASessionIsConstructibleResultBearingAndOwned = Assert<
  Equal<
    [
      WorkerExecutionHost['begin'] extends (
        request: WorkerExecutionRequest<WorkerTaskId<'liteship.worker.law.task-a'>>,
      ) => Result<
        WorkerExecutionSession<WorkerTaskId<'liteship.worker.law.task-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      WorkerExecutionRequest<WorkerTaskId<'liteship.worker.law.task-a'>>['task'],
      WorkerExecutionSession<WorkerTaskId<'liteship.worker.law.task-a'>>['id'],
      WorkerExecutionSession<WorkerTaskId<'liteship.worker.law.task-b'>> extends WorkerExecutionSession<
        WorkerTaskId<'liteship.worker.law.task-a'>
      >
        ? true
        : false,
      WorkerExecutionSession<WorkerTaskId>['lifecycle'],
    ],
    [
      true,
      WorkerTaskReference<WorkerTaskId<'liteship.worker.law.task-a'>>,
      WorkerTaskReference<WorkerTaskId<'liteship.worker.law.task-a'>>,
      false,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

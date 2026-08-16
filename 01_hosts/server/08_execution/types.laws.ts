/**
 * Compile-time laws for `01_hosts/server/08_execution`.
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
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { ExecutionRequest, RuntimeCommit, RuntimeExecutor } from '../../../00_core/16_runtime/types.js';
import type { Assert, CaseOf, Equal, InputOf, NonEmptyTuple, OutputOf, Result, Signature } from '../../../types.js';
import type { BoundServerDriver, ServerExecutionHost, ServerExecutionRequest, ServerExecutionSession, ServerSchedulingFacility, ServerTaskId, ServerTaskReference } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/** Compile-time law: a backend and its driver cannot disagree — distributively, native included. */
export type AServerBackendAndItsDriverCannotDisagree = Assert<
  Equal<
    Extract<BoundServerDriver, { readonly backend: 'host-native' }>['driver']['kind'],
    'host-native'
  >
>;


/** Compile-time law: the server host carries core's runtime execution contract exactly. */
export type TheServerHostCarriesTheRuntimeExecutionContract = Assert<
  Equal<
    [ServerExecutionHost['executor'], OutputOf<RuntimeExecutor['execute']>, InputOf<RuntimeExecutor['execute']>],
    [RuntimeExecutor, RuntimeCommit, ExecutionRequest]
  >
>;


/** Compile-time law: scheduling schedules before execution — never a commit identity. */
export type ServerSchedulingSchedulesBeforeExecution = Assert<
  Equal<
    [InputOf<ServerSchedulingFacility['schedule']>, OutputOf<ServerSchedulingFacility['schedule']>],
    [ExecutionRequest, ExecutionRequest]
  >
>;


/**
 * Compile-time law: sessions are constructible from the host, result-bearing
 * with the real commit, self-correlated — session B is not session A — and
 * owned.
 */
export type AServerSessionIsCancellableAndOwned = Assert<
  Equal<
    [
      ServerExecutionHost['begin'] extends (
        request: ServerExecutionRequest<ServerTaskId<'liteship.server.law.task-a'>>,
      ) => Result<
        ServerExecutionSession<ServerTaskId<'liteship.server.law.task-a'>>,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      ServerExecutionSession<ServerTaskId<'liteship.server.law.task-a'>>['result'],
      ServerExecutionSession<ServerTaskId<'liteship.server.law.task-a'>>['cancel'],
      ServerExecutionSession<ServerTaskId<'liteship.server.law.task-b'>> extends ServerExecutionSession<
        ServerTaskId<'liteship.server.law.task-a'>
      >
        ? true
        : false,
      ServerExecutionSession<ServerTaskId>['lifecycle'],
    ],
    [
      true,
      Signature<
        ServerTaskReference<ServerTaskId<'liteship.server.law.task-a'>>,
        RuntimeCommit,
        NonEmptyTuple<Diagnostic>
      >,
      Signature<
        ServerTaskReference<ServerTaskId<'liteship.server.law.task-a'>>,
        CancellationReceipt<ServerTaskReference<ServerTaskId<'liteship.server.law.task-a'>>>,
        NonEmptyTuple<Diagnostic>
      >,
      false,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

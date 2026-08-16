/**
 * Worker-local residual execution.
 *
 * This home realizes the exact core runtime-execution contract inside the
 * isolated realm: lawful backends bound to matching drivers, scheduling
 * before execution, cancellation, result transport back across the declared
 * channel, and trace. It owns no residual-program meaning, no compiler
 * placement, and no second executor — the executor is core's, consumed
 * exactly.
 *
 * Execution results leave the realm as a `RuntimeCommit` traveling a
 * declared channel; the worker never fabricates an applied address, because
 * physical application belongs to the realm that owns the egress.
 *
 * @module
 */

import type {
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { TransactionGeneration } from '../../../00_core/04_time/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type {
  ExecutionBackendDriver,
  ExecutionRequest,
  RuntimeCommit,
  RuntimeExecutor,
} from '../../../00_core/16_runtime/types.js';
import type {
  WorkerGroundingDefinition,
  WorkerPlacedBackend,
  WorkerRealizationOffer,
} from '../00_bootstrap/types.js';
import type { ChannelReference } from '../02_message/types.js';

/** Backends this home locally owns, derived from the bootstrap's placement authority. */
export type WorkerExecutionBackend = WorkerPlacedBackend;

/** Stable identity for one worker task. */
export type WorkerTaskId<Name extends string = string> = Brand<Name, 'liteship.worker.task-id'>;
/** Typed reference to one worker task. */
export type WorkerTaskReference<Id extends WorkerTaskId = WorkerTaskId> = Reference<
  'worker-task',
  Id
>;

/**
 * One backend bound to one driver whose own `kind` is that same backend —
 * distributively, so a javascript roster entry carrying a wasm driver is
 * unrepresentable even at the default type.
 */
type WorkerDriverBinding<Backend> = Backend extends WorkerExecutionBackend
  ? { readonly backend: Backend; readonly driver: ExecutionBackendDriver & { readonly kind: Backend } }
  : never;
/** Physical driver contract for bound worker. */
export type BoundWorkerDriver = WorkerDriverBinding<WorkerExecutionBackend>;

/**
 * The complete session request: the exact task identity the caller carries
 * and the core execution request together. The requester names the fresh
 * identity — the same discipline queue and buffer construction follow — so
 * the session the provider actually returns is exact from its first moment.
 */
export interface WorkerExecutionRequest<Id extends WorkerTaskId> {
  readonly task: WorkerTaskReference<Id>;
  readonly request: ExecutionRequest;
}

/**
 * The worker execution host: lawful backends bound to matching drivers and a
 * real core `RuntimeExecutor` — it actually executes and produces a
 * `RuntimeCommit` rather than owning drivers it never uses. Beginning is
 * task-correlated through the request: the session the public path returns
 * carries the exact identity the caller named, so its cancel and result
 * accept only that session — the provider path and the lawful path are the
 * same path.
 */
export interface WorkerExecutionHost {
  readonly drivers: NonEmptyTuple<BoundWorkerDriver>;
  readonly executor: RuntimeExecutor;
  readonly begin: <Id extends WorkerTaskId>(
    request: WorkerExecutionRequest<Id>,
  ) => Result<WorkerExecutionSession<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * The result leaving the realm: the exact session that produced it, the
 * transaction generation it answers, the full `RuntimeCommit`, and the
 * channel carrying it home. The session parameter has no default — an
 * envelope of session B is not an envelope of session A. That the named
 * generation equals the executed request's generation at runtime, and that
 * the named channel is the physically used one, are `system/assurance`
 * obligations; the relationships themselves are declared here.
 */
export interface ExecutionResultEnvelope<Id extends WorkerTaskId> {
  readonly session: WorkerTaskReference<Id>;
  readonly generation: TransactionGeneration;
  readonly commit: RuntimeCommit;
  readonly channel: ChannelReference;
}

/**
 * One cancellable, result-bearing execution session: a per-use owned
 * resource generic over its exact identity — session A's cancel and result
 * accept only session A, and the result is the real commit envelope, so a
 * session is never a task-shaped noun with no way to finish.
 */
export interface WorkerExecutionSession<Id extends WorkerTaskId> {
  readonly id: WorkerTaskReference<Id>;
  readonly request: ExecutionRequest;
  readonly cancel: Signature<
    WorkerTaskReference<Id>,
    CancellationReceipt<WorkerTaskReference<Id>>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly result: Signature<WorkerTaskReference<Id>, ExecutionResultEnvelope<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Narrow intrinsic authority over worker-local scheduling. Scheduling
 * schedules — its output is a scheduled request, never a completed commit,
 * so it cannot claim execution happened.
 */
export interface WorkerSchedulingFacility {
  readonly schedule: Signature<ExecutionRequest, ExecutionRequest, NonEmptyTuple<Diagnostic>>;
}

/** Capability requirement for worker scheduling. */
export type WorkerSchedulingRequirement = Hole<
  'liteship.worker.scheduling-facility',
  WorkerSchedulingFacility
>;
/** Capability requirement for worker execution. */
export type WorkerExecutionRequirement = Hole<'liteship.worker.execution', WorkerExecutionHost>;

/** Intrinsic grounding: the realm's scheduling facility, admitted narrowly. */
export interface WorkerSchedulingGrounding
  extends WorkerGroundingDefinition<
    readonly [WorkerSchedulingRequirement],
    WorkerSchedulingFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.worker.grounding.scheduling-facility'>;
}

/** Standing up worker execution: an offer requiring the scheduling facility. */
export interface WorkerExecutionOffer
  extends WorkerRealizationOffer<
    readonly [WorkerExecutionRequirement],
    readonly [WorkerSchedulingRequirement],
    NonEmptyTuple<WorkerExecutionBackend>,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.worker.offer.execution-host'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript' | 'wasm'>;
}

/** Type summary consumed by the worker topology. */
export interface WorkerExecutionTypeSurface {
  readonly host: WorkerExecutionHost;
  readonly driver: BoundWorkerDriver;
  readonly session: WorkerExecutionSession<WorkerTaskId>;
  readonly result: ExecutionResultEnvelope<WorkerTaskId>;
  readonly scheduling: WorkerSchedulingGrounding;
  readonly executionOffer: WorkerExecutionOffer;
}

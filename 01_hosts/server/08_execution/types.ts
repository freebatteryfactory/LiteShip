/**
 * Server execution: the core executor with native reach.
 *
 * This home realizes the exact core runtime-execution contract on the
 * server: javascript, wasm, and host-native backends bound to matching
 * drivers, scheduling before execution, cancellable sessions, and core's
 * exact `RuntimeExecutor`. No server-specific semantic program or commit
 * exists; JavaScript remains the reference behavior every other driver earns
 * parity against.
 *
 * @module
 */

import type {
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type {
  ExecutionBackendDriver,
  ExecutionRequest,
  RuntimeCommit,
  RuntimeExecutor,
} from '../../../00_core/16_runtime/types.js';
import type {
  ServerGroundingDefinition,
  ServerPlacedBackend,
  ServerRealizationOffer,
} from '../00_bootstrap/types.js';

/** Backends this home locally owns, derived from the bootstrap's placement authority. */
export type ServerExecutionBackend = ServerPlacedBackend;

export type ServerTaskId<Name extends string = string> = Brand<Name, 'liteship.server.task-id'>;
export type ServerTaskReference<Id extends ServerTaskId = ServerTaskId> = Reference<
  'server-task',
  Id
>;

/** One backend bound to one driver whose own kind is that same backend — distributively. */
type ServerDriverBinding<Backend> = Backend extends ServerExecutionBackend
  ? { readonly backend: Backend; readonly driver: ExecutionBackendDriver & { readonly kind: Backend } }
  : never;
export type BoundServerDriver = ServerDriverBinding<ServerExecutionBackend>;

/** The server execution host: matching drivers, core's exact executor, and a session path. */
export interface ServerExecutionHost {
  readonly drivers: NonEmptyTuple<BoundServerDriver>;
  readonly executor: RuntimeExecutor;
  readonly begin: Signature<ExecutionRequest, ServerExecutionSession<ServerTaskId>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * One cancellable, result-bearing execution session: a per-use owned
 * resource generic over its exact identity — session A's cancel and result
 * accept only session A, and the result is the real commit.
 */
export interface ServerExecutionSession<Id extends ServerTaskId> {
  readonly id: ServerTaskReference<Id>;
  readonly request: ExecutionRequest;
  readonly cancel: Signature<ServerTaskReference<Id>, ServerTaskReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly result: Signature<ServerTaskReference<Id>, RuntimeCommit, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Narrow intrinsic authority over server-local scheduling. */
export interface ServerSchedulingFacility {
  readonly schedule: Signature<ExecutionRequest, ExecutionRequest, NonEmptyTuple<Diagnostic>>;
}

export type ServerSchedulingRequirement = Hole<
  'liteship.server.scheduling-facility',
  ServerSchedulingFacility
>;
export type ServerExecutionRequirement = Hole<'liteship.server.execution', ServerExecutionHost>;

/** Intrinsic grounding: the scheduling facility, admitted narrowly. */
export interface ServerSchedulingGrounding
  extends ServerGroundingDefinition<
    readonly [ServerSchedulingRequirement],
    ServerSchedulingFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.scheduling-facility'>;
}

/** Standing up server execution: an offer requiring the scheduling facility. */
export interface ServerExecutionOffer
  extends ServerRealizationOffer<
    readonly [ServerExecutionRequirement],
    readonly [ServerSchedulingRequirement],
    NonEmptyTuple<ServerExecutionBackend>,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.execution-host'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript' | 'wasm' | 'host-native'>;
}

/** Type summary consumed by the server topology. */
export interface ServerExecutionTypeSurface {
  readonly host: ServerExecutionHost;
  readonly driver: BoundServerDriver;
  readonly session: ServerExecutionSession<ServerTaskId>;
  readonly scheduling: ServerSchedulingGrounding;
  readonly executionOffer: ServerExecutionOffer;
}

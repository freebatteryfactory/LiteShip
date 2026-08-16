/**
 * Edge execution: request-scoped realization of the core executor and exact
 * operation handlers.
 *
 * This home owns edge-local execution: lawful backends bound to matching
 * drivers, core's exact `RuntimeExecutor`, request-scoped sessions, and
 * host-bound operation-handler resources realizing core operation
 * definitions with exact identity. Edge may be a full authoritative
 * realization site when the selected plan lawfully supplies authenticated
 * authority, handler, storage, network, and policy requirements — the realm
 * name grants nothing, and the architecture forces no bounce through server.
 *
 * @module
 */

import type {
  BindingsFor,
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  Result,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  OperationDefinition,
  OperationId,
  OperationInvocation,
  OperationReceipt,
} from '../../../00_core/07_operation/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type {
  ExecutionBackendDriver,
  RuntimeExecutor,
} from '../../../00_core/16_runtime/types.js';
import type { EdgeGroundingDefinition, EdgePlacedBackend, EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type { EdgeInvocationRequirement } from '../00_bootstrap/types.js';
import type { EdgePolicyRequirement } from '../03_policy/types.js';

/** Backends this home locally owns, derived from the bootstrap's placement authority. */
export type EdgeExecutionBackend = EdgePlacedBackend;

export type EdgeHandlerId<Name extends string = string> = Brand<Name, 'liteship.edge.handler-id'>;
export type EdgeHandlerReference<Id extends EdgeHandlerId = EdgeHandlerId> = Reference<
  'edge-handler',
  Id
>;

/** One backend bound to one driver whose own kind is that same backend — distributively. */
type EdgeDriverBinding<Backend> = Backend extends EdgeExecutionBackend
  ? { readonly backend: Backend; readonly driver: ExecutionBackendDriver & { readonly kind: Backend } }
  : never;
export type BoundEdgeDriver = EdgeDriverBinding<EdgeExecutionBackend>;

/** The edge execution host: matching drivers and core's exact executor. */
export interface EdgeExecutionHost {
  readonly drivers: NonEmptyTuple<BoundEdgeDriver>;
  readonly executor: RuntimeExecutor;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * One live operation handler bound to the exact core operation it serves.
 * The identity is a parameter with no erasing default in the governed
 * construction path — a handler for operation A is provably not a handler
 * for operation B, and its invocation and receipt speak the definition's own
 * input, output, and failure families.
 */
export interface EdgeOperationHandler<
  Op extends OperationId,
  Input,
  Output,
  Failure,
  Requirements extends RequirementRow,
> {
  readonly id: EdgeHandlerReference;
  readonly operation: Op;
  readonly definition: OperationDefinition<Input, Output, Failure, Requirements, Op>;
  readonly capabilities: BindingsFor<Requirements>;
  readonly handle: Signature<
    OperationInvocation<Input, Op>,
    OperationReceipt<Output, Failure, Op>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete handler binding request: exact operation and definition together. */
export interface EdgeHandlerBindingRequest<
  Op extends OperationId,
  Input,
  Output,
  Failure,
  Requirements extends RequirementRow,
> {
  readonly operation: Op;
  readonly definition: OperationDefinition<Input, Output, Failure, Requirements, Op>;
  readonly capabilities: BindingsFor<Requirements>;
}

/**
 * The handler provider: binding is operation-correlated — binding operation
 * A yields a handler of A, never of B.
 */
export interface EdgeOperationAuthority {
  readonly bind: <Op extends OperationId, Input, Output, Failure, Requirements extends RequirementRow>(
    request: EdgeHandlerBindingRequest<Op, Input, Output, Failure, Requirements>,
  ) => Result<EdgeOperationHandler<Op, Input, Output, Failure, Requirements>, NonEmptyTuple<Diagnostic>>;
}

/** Narrow intrinsic authority over the platform's execution machinery. */
export interface EdgeExecutionFacility {
  readonly drivers: NonEmptyTuple<BoundEdgeDriver>;
}

export type EdgeExecutionFacilityRequirement = Hole<
  'liteship.edge.execution-facility',
  EdgeExecutionFacility
>;
export type EdgeExecutionRequirement = Hole<'liteship.edge.execution', EdgeExecutionHost>;
export type EdgeOperationRequirement = Hole<'liteship.edge.operation', EdgeOperationAuthority>;

/** Intrinsic grounding: the platform execution machinery, admitted narrowly. */
export interface EdgeExecutionFacilityGrounding
  extends EdgeGroundingDefinition<
    readonly [EdgeExecutionFacilityRequirement],
    EdgeExecutionFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.execution-facility'>;
}

/** Standing up edge execution: request-scoped, invocation- and policy-bound. */
export interface EdgeExecutionOffer
  extends EdgeRealizationOffer<
    readonly [EdgeExecutionRequirement, EdgeOperationRequirement],
    readonly [EdgeExecutionFacilityRequirement, EdgeInvocationRequirement, EdgePolicyRequirement],
    NonEmptyTuple<EdgeExecutionBackend>,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.execution-host'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript' | 'wasm'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeExecutionTypeSurface {
  readonly host: EdgeExecutionHost;
  readonly driver: BoundEdgeDriver;
  readonly handler: EdgeOperationHandler<OperationId, unknown, unknown, unknown, readonly []>;
  readonly operationAuthority: EdgeOperationAuthority;
  readonly facility: EdgeExecutionFacilityGrounding;
  readonly executionOffer: EdgeExecutionOffer;
}

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
  Assert,
  BindingsFor,
  Brand,
  CaseOf,
  Equal,
  Hole,
  InputOf,
  NonEmptyTuple,
  OutputOf,
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
  OperationReference,
} from '../../../00_core/07_operation/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type {
  ExecutionBackendDriver,
  ExecutionRequest,
  RuntimeCommit,
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
  readonly admitted: true;
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
    unknown,
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

// ---------------------------------------------------------------------------
// Laws
//
// Parity with the reference backend, request budgets, and that advisory
// hints never confer authorization are assurance and empirical obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: a backend and its driver cannot disagree — distributively. */
export type AnEdgeBackendAndItsDriverCannotDisagree = Assert<
  Equal<Extract<BoundEdgeDriver, { readonly backend: 'wasm' }>['driver']['kind'], 'wasm'>
>;

/** Compile-time law: the host actually executes — core's executor, exactly. */
export type TheEdgeHostActuallyExecutes = Assert<
  Equal<
    [EdgeExecutionHost['executor'], OutputOf<RuntimeExecutor['execute']>, InputOf<RuntimeExecutor['execute']>],
    [RuntimeExecutor, RuntimeCommit, ExecutionRequest]
  >
>;

/**
 * Compile-time law: a handler pins its exact operation and threads it — its
 * definition's id, its invocations, and its receipts all name exactly this
 * operation, so an invocation naming operation B cannot reach a handler for
 * operation A.
 */
type LawRowA = readonly [Hole<'liteship.edge.law.capability-a', { readonly use: () => void }>];
type LawRowB = readonly [Hole<'liteship.edge.law.capability-b', { readonly use: () => void }>];

export type AHandlerCannotServeAnotherOperation = Assert<
  Equal<
    [
      EdgeOperationHandler<OperationId<'liteship.operation.law.op-a'>, string, string, string, LawRowA>['operation'],
      EdgeOperationHandler<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        LawRowA
      >['definition']['id'],
      InputOf<
        EdgeOperationHandler<
          OperationId<'liteship.operation.law.op-a'>,
          string,
          string,
          string,
          LawRowA
        >['handle']
      >['operation'],
      OperationInvocation<string, OperationId<'liteship.operation.law.op-b'>> extends OperationInvocation<
        string,
        OperationId<'liteship.operation.law.op-a'>
      >
        ? true
        : false,
      EdgeOperationHandler<
        OperationId<'liteship.operation.law.op-b'>,
        string,
        string,
        string,
        LawRowA
      > extends EdgeOperationHandler<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        LawRowA
      >
        ? true
        : false,
    ],
    [
      OperationId<'liteship.operation.law.op-a'>,
      OperationId<'liteship.operation.law.op-a'>,
      OperationReference<OperationId<'liteship.operation.law.op-a'>>,
      false,
      false,
    ]
  >
>;

/**
 * Compile-time law: the requirements relationship threads — the handler's
 * definition carries the exact row, its capabilities are exactly the
 * bindings for that row, and a handler of row B is not a handler of row A.
 */
export type AHandlerThreadsItsRequirements = Assert<
  Equal<
    [
      EdgeOperationHandler<OperationId, string, string, string, LawRowA>['definition']['requirements'],
      EdgeOperationHandler<OperationId, string, string, string, LawRowA>['capabilities'],
      EdgeOperationHandler<OperationId, string, string, string, LawRowB> extends EdgeOperationHandler<
        OperationId,
        string,
        string,
        string,
        LawRowA
      >
        ? true
        : false,
    ],
    [LawRowA, BindingsFor<LawRowA>, false]
  >
>;

/** Compile-time law: binding is operation-correlated through the provider's generic operation. */
export type HandlerBindingIsOperationCorrelated = Assert<
  Equal<
    EdgeOperationAuthority['bind'] extends (
      request: EdgeHandlerBindingRequest<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        LawRowA
      >,
    ) => Result<
      EdgeOperationHandler<OperationId<'liteship.operation.law.op-a'>, string, string, string, LawRowA>,
      NonEmptyTuple<Diagnostic>
    >
      ? true
      : false,
    true
  >
>;

/** Type summary consumed by the edge topology. */
export interface EdgeExecutionTypeSurface {
  readonly host: EdgeExecutionHost;
  readonly driver: BoundEdgeDriver;
  readonly handler: EdgeOperationHandler<OperationId, unknown, unknown, unknown, readonly []>;
  readonly operationAuthority: EdgeOperationAuthority;
  readonly facility: EdgeExecutionFacilityGrounding;
  readonly executionOffer: EdgeExecutionOffer;
}

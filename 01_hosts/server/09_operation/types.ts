/**
 * Trusted operation handlers: exact bindings to core operation definitions.
 *
 * This home owns server-physical operation-handler providers and live
 * handler resources bound to exact core operation specifications with exact
 * capability rows. Handler construction, authority scope, idempotency
 * resources, cancellation, result, failure, and lifecycle live here. Direct,
 * HTTP, CLI, MCP, LSP, and browser wires remain downstream projections over
 * this same authority — no wire restates the operation catalog, and no
 * handler is authorized by placement.
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
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type {
  IdempotencyKey,
  OperationDefinition,
  OperationId,
  OperationInvocation,
  OperationReference,
  OperationReceipt,
} from '../../../00_core/07_operation/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';

/** Stable identity for one server handler. */
export type ServerHandlerId<Name extends string = string> = Brand<
  Name,
  'liteship.server.handler-id'
>;
/** Typed reference to one server handler. */
export type ServerHandlerReference<Id extends ServerHandlerId = ServerHandlerId> = Reference<
  'server-handler',
  Id
>;
/** Stable identity for one server operation execution. */
export type ServerOperationExecutionId<Name extends string = string> = Brand<
  Name,
  'liteship.server.operation-execution-id'
>;
/** Typed reference to one server operation execution. */
export type ServerOperationExecutionReference<
  Id extends ServerOperationExecutionId = ServerOperationExecutionId,
> = Reference<'server-operation-execution', Id>;

/** One idempotency resource: the key and its receipt-lookup contract. */
export interface IdempotencyResource {
  readonly key: IdempotencyKey;
  readonly lookup: Signature<
    IdempotencyKey,
    readonly OperationReceipt[],
    NonEmptyTuple<Diagnostic>
  >;
}

/** The complete invocation of one exact in-flight operation execution. */
export interface ServerOperationExecutionRequest<
  Op extends OperationId,
  Input,
  Execution extends ServerOperationExecutionId,
> {
  readonly execution: ServerOperationExecutionReference<Execution>;
  readonly invocation: OperationInvocation<Input, Op>;
}

/**
 * One in-flight execution. Cancellation applies to this per-use subject, not
 * to the long-lived handler that can serve many executions concurrently.
 */
export interface ServerOperationExecution<
  Op extends OperationId,
  Input,
  Output,
  Failure,
  Execution extends ServerOperationExecutionId = ServerOperationExecutionId,
> {
  readonly id: ServerOperationExecutionReference<Execution>;
  readonly handler: ServerHandlerReference;
  readonly invocation: OperationInvocation<Input, Op>;
  readonly cancel: Signature<
    ServerOperationExecutionReference<Execution>,
    CancellationReceipt<ServerOperationExecutionReference<Execution>>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly result: Signature<
    ServerOperationExecutionReference<Execution>,
    OperationReceipt<Output, Failure, Op>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * One live server handler bound to the exact core operation it serves, with
 * the exact capability row the definition demands. A handler for operation A
 * is provably not a handler for operation B, and its invocation and receipt
 * speak the definition's own input, output, and failure families.
 */
export interface ServerOperationHandler<
  Op extends OperationId,
  Input,
  Output,
  Failure,
  Requirements extends RequirementRow,
> {
  readonly id: ServerHandlerReference;
  readonly operation: Op;
  readonly definition: OperationDefinition<Input, Output, Failure, Requirements, Op>;
  readonly capabilities: BindingsFor<Requirements>;
  readonly idempotency: IdempotencyResource;
  readonly handle: <Execution extends ServerOperationExecutionId>(
    request: ServerOperationExecutionRequest<Op, Input, Execution>,
  ) => Result<
    ServerOperationExecution<Op, Input, Output, Failure, Execution>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete binding request: exact operation and definition together. */
export interface ServerHandlerBindingRequest<
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

/** The handler provider: binding is operation-correlated. */
export interface ServerOperationAuthority {
  readonly bind: <Op extends OperationId, Input, Output, Failure, Requirements extends RequirementRow>(
    request: ServerHandlerBindingRequest<Op, Input, Output, Failure, Requirements>,
  ) => Result<ServerOperationHandler<Op, Input, Output, Failure, Requirements>, NonEmptyTuple<Diagnostic>>;
}

/** The admitted handler catalog beneath the provider. */
export interface OperationCatalogBinding {
  readonly address: ContentAddress<'application/vnd.liteship.server-operation-catalog+cbor'>;
  readonly operations: NonEmptyTuple<OperationReference>;
}

/** Capability requirement for operation catalog. */
export type OperationCatalogRequirement = Hole<
  'liteship.server.operation-catalog',
  OperationCatalogBinding
>;
/** Capability requirement for server operation. */
export type ServerOperationRequirement = Hole<'liteship.server.operations', ServerOperationAuthority>;

/** Deployment grounding: the handler catalog enters admitted. */
export interface OperationCatalogGrounding
  extends ServerGroundingDefinition<
    readonly [OperationCatalogRequirement],
    OperationCatalogBinding,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.operation-catalog'>;
}

/** Constructing the handler provider over the admitted catalog. */
export interface ServerOperationOffer
  extends ServerRealizationOffer<
    readonly [ServerOperationRequirement],
    readonly [OperationCatalogRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.operation-handler'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the server topology. */
export interface ServerOperationTypeSurface {
  readonly handler: ServerOperationHandler<OperationId, unknown, unknown, unknown, readonly []>;
  readonly execution: ServerOperationExecution<OperationId, unknown, unknown, unknown>;
  readonly idempotency: IdempotencyResource;
  readonly authority: ServerOperationAuthority;
  readonly catalogGrounding: OperationCatalogGrounding;
  readonly operationOffer: ServerOperationOffer;
}

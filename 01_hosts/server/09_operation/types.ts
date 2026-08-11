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
  Assert,
  BindingsFor,
  Brand,
  CaseOf,
  Equal,
  Hole,
  InputOf,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  Result,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  IdempotencyKey,
  OperationDefinition,
  OperationId,
  OperationInvocation,
  OperationReceipt,
  OperationReference,
} from '../../../00_core/07_operation/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';

export type ServerHandlerId<Name extends string = string> = Brand<
  Name,
  'liteship.server.handler-id'
>;
export type ServerHandlerReference<Id extends ServerHandlerId = ServerHandlerId> = Reference<
  'server-handler',
  Id
>;

/** One idempotency resource: the key and its receipt-lookup contract. */
export interface IdempotencyResource {
  readonly key: IdempotencyKey;
  readonly lookup: Signature<
    IdempotencyKey,
    readonly OperationReceipt[],
    NonEmptyTuple<Diagnostic>
  >;
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
  readonly handle: Signature<
    OperationInvocation<Input, Op>,
    OperationReceipt<Output, Failure, Op>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly cancel: Signature<ServerHandlerReference, ServerHandlerReference, NonEmptyTuple<Diagnostic>>;
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
  readonly admitted: true;
}

export type OperationCatalogRequirement = Hole<
  'liteship.server.operation-catalog',
  OperationCatalogBinding
>;
export type ServerOperationRequirement = Hole<'liteship.server.operations', ServerOperationAuthority>;

/** Deployment grounding: the handler catalog enters admitted. */
export interface OperationCatalogGrounding
  extends ServerGroundingDefinition<
    readonly [OperationCatalogRequirement],
    unknown,
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

// ---------------------------------------------------------------------------
// Laws
//
// That handlers use the canonical operation catalog and exact schemas, and
// that authorization is checked rather than assumed from placement, are
// `system/assurance` obligations.
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a handler pins its exact operation and threads it — the
 * definition's id, the invocations it handles, and the receipts it emits all
 * name exactly this operation.
 */
type LawRowA = readonly [Hole<'liteship.server.law.capability-a', { readonly use: () => void }>];
type LawRowB = readonly [Hole<'liteship.server.law.capability-b', { readonly use: () => void }>];

export type AServerHandlerCannotServeAnotherOperation = Assert<
  Equal<
    [
      ServerOperationHandler<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        LawRowA
      >['operation'],
      ServerOperationHandler<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        LawRowA
      >['definition']['id'],
      InputOf<
        ServerOperationHandler<
          OperationId<'liteship.operation.law.op-a'>,
          string,
          string,
          string,
          LawRowA
        >['handle']
      >['operation'],
      ServerOperationHandler<
        OperationId<'liteship.operation.law.op-b'>,
        string,
        string,
        string,
        LawRowA
      > extends ServerOperationHandler<
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
    ]
  >
>;

/**
 * Compile-time law: the requirements relationship threads — the handler's
 * definition carries the exact row, its capabilities are exactly the
 * bindings for that row, and a handler of row B is not a handler of row A.
 */
export type AServerHandlerThreadsItsRequirements = Assert<
  Equal<
    [
      ServerOperationHandler<OperationId, string, string, string, LawRowA>['definition']['requirements'],
      ServerOperationHandler<OperationId, string, string, string, LawRowA>['capabilities'],
      ServerOperationHandler<OperationId, string, string, string, LawRowB> extends ServerOperationHandler<
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
export type ServerBindingIsOperationCorrelated = Assert<
  Equal<
    ServerOperationAuthority['bind'] extends (
      request: ServerHandlerBindingRequest<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        LawRowA
      >,
    ) => Result<
      ServerOperationHandler<OperationId<'liteship.operation.law.op-a'>, string, string, string, LawRowA>,
      NonEmptyTuple<Diagnostic>
    >
      ? true
      : false,
    true
  >
>;

/** Compile-time law: a handler carries idempotency, capabilities, and an owned lifecycle. */
export type AHandlerCarriesItsObligations = Assert<
  Equal<
    [
      ServerOperationHandler<OperationId, string, string, string, readonly []>['idempotency']['key'],
      ServerOperationHandler<OperationId, string, string, string, readonly []>['lifecycle'],
    ],
    [IdempotencyKey, CaseOf<RealizationLifecycle, 'owned'>]
  >
>;

/** Type summary consumed by the server topology. */
export interface ServerOperationTypeSurface {
  readonly handler: ServerOperationHandler<OperationId, unknown, unknown, unknown, readonly []>;
  readonly idempotency: IdempotencyResource;
  readonly authority: ServerOperationAuthority;
  readonly catalogGrounding: OperationCatalogGrounding;
  readonly operationOffer: ServerOperationOffer;
}

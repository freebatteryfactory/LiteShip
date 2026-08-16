/**
 * Compile-time laws for `01_hosts/server/09_operation`.
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
import type { IdempotencyKey, OperationId, OperationReference } from '../../../00_core/07_operation/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, BindingsFor, CaseOf, Equal, Hole, NonEmptyTuple, Result, Signature } from '../../../types.js';
import type { OperationCatalogBinding, ServerHandlerBindingRequest, ServerOperationAuthority, ServerOperationExecution, ServerOperationExecutionId, ServerOperationExecutionReference, ServerOperationExecutionRequest, ServerOperationHandler } from './types.js';

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
      ServerOperationHandler<
          OperationId<'liteship.operation.law.op-a'>,
          string,
          string,
          string,
          LawRowA
        >['handle'] extends (
          request: ServerOperationExecutionRequest<
            OperationId<'liteship.operation.law.op-a'>,
            string,
            ServerOperationExecutionId<'liteship.server.operation.law.execution-a'>
          >,
        ) => Result<
          ServerOperationExecution<
            OperationId<'liteship.operation.law.op-a'>,
            string,
            string,
            string,
            ServerOperationExecutionId<'liteship.server.operation.law.execution-a'>
          >,
          NonEmptyTuple<Diagnostic>
        >
          ? true
          : false,
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
      true,
      false,
    ]
  >
>;


/** Compile-time law: cancellation belongs to the exact in-flight execution, never the handler. */
export type CancellationTargetsOneOperationExecution = Assert<
  Equal<
    [
      ServerOperationExecution<
        OperationId<'liteship.operation.law.op-a'>,
        string,
        string,
        string,
        ServerOperationExecutionId<'liteship.server.operation.law.execution-a'>
      >['cancel'],
      'cancel' extends keyof ServerOperationHandler<
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
      Signature<
        ServerOperationExecutionReference<ServerOperationExecutionId<'liteship.server.operation.law.execution-a'>>,
        CancellationReceipt<
          ServerOperationExecutionReference<ServerOperationExecutionId<'liteship.server.operation.law.execution-a'>>
        >,
        NonEmptyTuple<Diagnostic>
      >,
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

/** Compile-time law: the deployment grounding carries the addressed operation definitions. */
export type TheOperationCatalogCarriesReferencesNotAMarker = Assert<
  Equal<
    [OperationCatalogBinding['address'], OperationCatalogBinding['operations']],
    [
      ContentAddress<'application/vnd.liteship.server-operation-catalog+cbor'>,
      NonEmptyTuple<OperationReference>,
    ]
  >
>;

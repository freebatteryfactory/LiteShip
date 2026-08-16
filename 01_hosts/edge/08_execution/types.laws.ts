/**
 * Compile-time laws for `01_hosts/edge/08_execution`.
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
import type { OperationId, OperationInvocation, OperationReference } from '../../../00_core/07_operation/types.js';
import type { ExecutionRequest, RuntimeCommit, RuntimeExecutor } from '../../../00_core/16_runtime/types.js';
import type { Assert, BindingsFor, Equal, Hole, InputOf, NonEmptyTuple, OutputOf, Result } from '../../../types.js';
import type { BoundEdgeDriver, EdgeExecutionFacility, EdgeExecutionHost, EdgeHandlerBindingRequest, EdgeOperationAuthority, EdgeOperationHandler } from './types.js';

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


/** Compile-time law: the edge host carries core's runtime execution contract exactly. */
export type TheEdgeHostCarriesTheRuntimeExecutionContract = Assert<
  Equal<
    [EdgeExecutionHost['executor'], OutputOf<RuntimeExecutor['execute']>, InputOf<RuntimeExecutor['execute']>],
    [RuntimeExecutor, RuntimeCommit, ExecutionRequest]
  >
>;

/** Compile-time law: the intrinsic execution grounding supplies actual matched drivers. */
export type TheExecutionFacilityCarriesDriversNotAMarker = Assert<
  Equal<EdgeExecutionFacility['drivers'], NonEmptyTuple<BoundEdgeDriver>>
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

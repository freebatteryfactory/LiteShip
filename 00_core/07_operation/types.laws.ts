/**
 * Compile-time laws for `00_core/07_operation`.
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

import type { Assert, Equal } from '../../types.js';
import type { OperationDefinition, OperationId, OperationInvocation, OperationReceipt, OperationReference, ResourceBudget } from './types.js';

/** Compile-time law: a resource budget must declare at least one limit. */
export type ResourceBudgetRejectsEmpty = Assert<Equal<{} extends ResourceBudget ? true : false, false>>;


/**
 * Compile-time law: an operation's identity threads — the definition's id,
 * the invocation's operation, the policy's operation, and the receipt's
 * invocation all name one exact operation, and an invocation of operation B
 * is not an invocation of operation A.
 */
export type AnOperationThreadsItsIdentity = Assert<
  Equal<
    [
      OperationDefinition<unknown, unknown, unknown, readonly [], OperationId<'liteship.operation.law.op-a'>>['id'],
      OperationInvocation<unknown, OperationId<'liteship.operation.law.op-a'>>['operation'],
      OperationReceipt<unknown, unknown, OperationId<'liteship.operation.law.op-a'>>['invocation']['operation'],
      OperationInvocation<unknown, OperationId<'liteship.operation.law.op-b'>> extends OperationInvocation<
        unknown,
        OperationId<'liteship.operation.law.op-a'>
      >
        ? true
        : false,
    ],
    [
      OperationId<'liteship.operation.law.op-a'>,
      OperationReference<OperationId<'liteship.operation.law.op-a'>>,
      OperationReference<OperationId<'liteship.operation.law.op-a'>>,
      false,
    ]
  >
>;

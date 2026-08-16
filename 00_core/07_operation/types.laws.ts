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

import type { Diagnostic } from '../00_error/types.js';
import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, TagOf } from '../../types.js';
import type {
  ApprovalRequirement,
  OperationDefinition,
  OperationId,
  OperationInvocation,
  OperationPolicyDecision,
  OperationPolicyDisposition,
  OperationReceipt,
  OperationReference,
  ResourceBudget,
} from './types.js';

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
      OperationPolicyDecision<OperationId<'liteship.operation.law.op-a'>>['operation'],
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
      OperationReference<OperationId<'liteship.operation.law.op-a'>>,
      false,
    ]
  >
>;

/** Compile-time law: policy disposition and approval cannot tell conflicting stories. */
export type OperationPolicyDispositionCorrelatesApprovalAndAuthorization = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<OperationPolicyDisposition>, 'allowed' | 'approval-required' | 'denied'>,
        Equal<TagOf<ApprovalRequirement>, 'none' | 'human' | 'independent'>,
        Equal<
          CaseOf<OperationPolicyDisposition, 'allowed'>['approval'],
          CaseOf<ApprovalRequirement, 'none'>
        >,
        Equal<
          CaseOf<OperationPolicyDisposition, 'approval-required'>['approval'],
          | CaseOf<ApprovalRequirement, 'human'>
          | CaseOf<ApprovalRequirement, 'independent'>
        >,
        Equal<
          CaseOf<OperationPolicyDisposition, 'denied'>['diagnostics'],
          NonEmptyTuple<Diagnostic>
        >,
        CaseOf<ApprovalRequirement, 'human'> extends CaseOf<
          OperationPolicyDisposition,
          'allowed'
        >['approval']
          ? true
          : false,
        CaseOf<ApprovalRequirement, 'none'> extends CaseOf<
          OperationPolicyDisposition,
          'approval-required'
        >['approval']
          ? true
          : false,
        OperationPolicyDecision<OperationId<'liteship.operation.law.op-a'>> extends OperationPolicyDecision<
          OperationId<'liteship.operation.law.op-b'>
        >
          ? true
          : false,
      ],
      [true, true, true, true, true, false, false, false]
    >
  >
>;

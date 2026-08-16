/**
 * Compile-time laws for `02_targets/astro/05_server`.
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
import type { OperationId, OperationInvocation, OperationReceipt } from '../../../00_core/07_operation/types.js';
import type { AdmittedRequest, EdgeRequestId } from '../../../01_hosts/edge/01_request/types.js';
import type { ResponseCommitGrant } from '../../../01_hosts/edge/09_response/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { AstroMount, AstroMountOutcome } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawOpA = OperationId<'liteship.graph.query'>;

type LawOpB = OperationId<'liteship.graph.mutate'>;


/**
 * Compile-time law: an attachment names one exact operation, and two
 * operations are not interchangeable.
 */
export type AMountNamesOneExactOperation = Assert<
  Equal<
    [
      Equal<AstroMount<LawOpA>['invocation'], OperationInvocation<unknown, LawOpA>>,
      AstroMount<LawOpA> extends AstroMount<LawOpB> ? true : false,
    ],
    [true, false]
  >
>;


/**
 * Compile-time law: the attachment carries the host's admitted request and the
 * host's commit grant, not restatements of either.
 *
 * Written against the imported authorities. A local twin of `AdmittedRequest`
 * would be structurally identical to the compiler and would fail this law,
 * which is the only way provenance can be checked in a type.
 */
export type AMountCarriesHostAuthorities = Assert<
  Equal<
    [
      Equal<AstroMount<LawOpA>['request'], AdmittedRequest<EdgeRequestId>>,
      Equal<AstroMount<LawOpA>['commit'], ResponseCommitGrant>,
    ],
    [true, true]
  >
>;


/**
 * Compile-time law: the outcome is a core receipt, not a response.
 *
 * A target that produced a response would have chosen a status and a
 * representation, which is exactly the authority it must not hold.
 */
export type AMountProducesAReceiptNotAResponse = Assert<
  Equal<
    [
      Equal<CaseOf<AstroMountOutcome<LawOpA>, 'received'>['receipt'], OperationReceipt<unknown, readonly Diagnostic[], LawOpA>>,
      'response' extends keyof CaseOf<AstroMountOutcome<LawOpA>, 'received'> ? true : false,
      'status' extends keyof CaseOf<AstroMountOutcome<LawOpA>, 'received'> ? true : false,
    ],
    [true, false, false]
  >
>;


/** Compile-time law: an unmountable attachment says why and carries no receipt. */
export type AnUnmountableAttachmentExplainsItself = Assert<
  Equal<
    [
      Equal<CaseOf<AstroMountOutcome<LawOpA>, 'unmountable'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      'receipt' extends keyof CaseOf<AstroMountOutcome<LawOpA>, 'unmountable'> ? true : false,
    ],
    [true, false]
  >
>;

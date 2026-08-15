/**
 * Compile-time laws for `01_hosts/edge/09_response`.
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
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { Assert, CaseOf, Equal, HoleContract, NonEmptyTuple, Result, Signature, TagOf } from '../../../types.js';
import type { EdgeRequestId, EdgeRequestReference } from '../01_request/types.js';
import type { EdgeResponsePolicy } from '../03_policy/types.js';
import type { CommittedResponse, ResponseCommitAddress, ResponseCommitAuthority, ResponseCommitGrant, ResponseCommitRequirement, ResponseFacility, ResponseFailure, ResponsePlan, ResponseStream, ResponseStreamId, ResponseStreamReference } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That exactly one response is physically written per invocation, and that
// the grant answers only its own invocation's request
// (`response-commit-request-agreement`), are `system/assurance` obligations;
// buffering-versus-streaming crossover is empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: a plan names its exact request and its governing policy. */
export type APlanNamesItsRequestAndPolicy = Assert<
  Equal<
    [
      ResponsePlan<EdgeRequestId<'liteship.edge.law.request-a'>>['request'],
      ResponsePlan<EdgeRequestId>['policy'],
    ],
    [
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      EdgeResponsePolicy['address'],
    ]
  >
>;


/** Compile-time law: committed means carrying the receipt — a plan is not a committed response. */
export type CommittedMeansCarryingTheReceipt = Assert<
  Equal<
    [
      CommittedResponse<EdgeRequestId>['receipt'],
      ResponsePlan<EdgeRequestId> extends CommittedResponse<EdgeRequestId> ? true : false,
    ],
    [ResponseCommitAddress, false]
  >
>;


/**
 * Compile-time law: commitment and streaming are request-correlated — a plan
 * for request A yields a committed response or stream for exactly A, never
 * B — and streaming finishes into the same single commit.
 */
export type CommitmentIsRequestCorrelated = Assert<
  Equal<
    [
      ResponseCommitAuthority<EdgeRequestId<'liteship.edge.law.request-a'>>['commit'],
      ResponseCommitAuthority<EdgeRequestId<'liteship.edge.law.request-a'>>['request'],
      ResponseFacility<EdgeRequestId<'liteship.edge.law.request-a'>>['request'],
      ResponseCommitAuthority<EdgeRequestId<'liteship.edge.law.request-b'>> extends ResponseCommitAuthority<
        EdgeRequestId<'liteship.edge.law.request-a'>
      >
        ? true
        : false,
      CommittedResponse<EdgeRequestId<'liteship.edge.law.request-b'>> extends CommittedResponse<
        EdgeRequestId<'liteship.edge.law.request-a'>
      >
        ? true
        : false,
      ResponseStream<EdgeRequestId, ResponseStreamId<'liteship.edge.law.stream-a'>>['finish'],
      ResponseStream<EdgeRequestId, ResponseStreamId<'liteship.edge.law.stream-a'>>['cancel'],
    ],
    [
      (
        plan: ResponsePlan<EdgeRequestId<'liteship.edge.law.request-a'>>,
      ) => Result<CommittedResponse<EdgeRequestId<'liteship.edge.law.request-a'>>, ResponseFailure>,
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      false,
      false,
      Signature<
        ResponseStreamReference<ResponseStreamId<'liteship.edge.law.stream-a'>>,
        CommittedResponse<EdgeRequestId>,
        NonEmptyTuple<Diagnostic>
      >,
      Signature<
        ResponseStreamReference<ResponseStreamId<'liteship.edge.law.stream-a'>>,
        CancellationReceipt<ResponseStreamReference<ResponseStreamId<'liteship.edge.law.stream-a'>>>,
        NonEmptyTuple<Diagnostic>
      >,
    ]
  >
>;


/**
 * Compile-time law: the contract the requirement actually carries is the
 * request-correlated grant, not a commit-capable authority — granting
 * request A yields the authority for exactly A, and no broad `commit`
 * member exists to reach through the hole. This is the provider-path half
 * of request-scoped commitment: the local A/B law proves the authority,
 * and this law proves that the only public door to an authority names its
 * request first.
 */
export type TheCarriedContractGrantsOnlyCorrelatedAuthority = Assert<
  Equal<
    [
      HoleContract<ResponseCommitRequirement>,
      ResponseCommitGrant['grant'] extends (
        request: EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      ) => Result<ResponseCommitAuthority<EdgeRequestId<'liteship.edge.law.request-a'>>, ResponseFailure>
        ? true
        : false,
      'commit' extends keyof HoleContract<ResponseCommitRequirement> ? true : false,
      'open' extends keyof HoleContract<ResponseCommitRequirement> ? true : false,
    ],
    [ResponseCommitGrant, true, false, false]
  >
>;


/** Compile-time law: commit failure is phase-correct — only after-commit names a receipt. */
export type CommitFailureIsPhaseCorrect = Assert<
  Equal<
    [
      TagOf<ResponseFailure>,
      CaseOf<ResponseFailure, 'afterCommit'>['receipt'],
      'receipt' extends keyof CaseOf<ResponseFailure, 'beforeCommit'> ? true : false,
    ],
    ['beforeCommit' | 'afterCommit', ResponseCommitAddress, false]
  >
>;

/**
 * The edge response: one plan, one commit authority, one committed response.
 *
 * This home owns the exact physical response resource and the only edge
 * response-commit authority. A response plan is not a committed response —
 * they are distinct types, and only the commit authority turns one into the
 * other, minting the receipt address. Settlement and execution never
 * fabricate a committed response, and the exact response is written once.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  HoleContract,
  NonEmptyTuple,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition, EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type {
  AdmittedCookie,
  AdmittedHeader,
  EdgeRequestId,
  EdgeRequestReference,
} from '../01_request/types.js';
import type { EdgeEncodedChunk } from '../05_network/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { EdgePolicyRequirement, EdgeResponsePolicy } from '../03_policy/types.js';

/** A closed status vocabulary carrier — an admitted status, never a bare number. */
export type AdmittedStatus = Brand<number, 'liteship.edge.admitted-status'>;

/** The physical receipt address only commitment mints. */
export type ResponseCommitAddress = ContentAddress<'application/vnd.liteship.edge-response-commit+cbor'>;

/**
 * The response plan: status, headers, cookies, body address, the exact
 * request it answers, and the exact policy that governs it. A plan is inert —
 * it commits nothing.
 */
export interface ResponsePlan<Id extends EdgeRequestId> {
  readonly request: EdgeRequestReference<Id>;
  readonly status: AdmittedStatus;
  readonly headers: readonly AdmittedHeader[];
  readonly cookies: readonly AdmittedCookie[];
  readonly body: ContentAddress<'application/vnd.liteship.edge-response-body+cbor'>;
  readonly policy: EdgeResponsePolicy['address'];
}

/**
 * The committed response: the plan it realized plus the receipt only the
 * commit authority mints. Structurally distinct from the plan — carrying the
 * receipt is what being committed means.
 */
export interface CommittedResponse<Id extends EdgeRequestId> {
  readonly plan: ResponsePlan<Id>;
  readonly receipt: ResponseCommitAddress;
}

/** Bounded streaming shape — backpressure, never a numeric constant. */
export interface ResponseBufferBound {
  readonly bounded: true;
}

/**
 * One live response stream: opened from the exact plan it realizes, bounded,
 * writable, cancellable, and finished into the committed response for
 * exactly the same request. Streaming is the incremental path to the same
 * single commit — it never mints a second receipt authority.
 */
export interface ResponseStream<Id extends EdgeRequestId> {
  readonly plan: ResponsePlan<Id>;
  readonly buffer: ResponseBufferBound;
  readonly write: Signature<EdgeEncodedChunk, ResponseBufferBound, NonEmptyTuple<Diagnostic>>;
  readonly cancel: Signature<EdgeRequestReference<Id>, EdgeRequestReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly finish: Signature<ResponsePlan<Id>, CommittedResponse<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * Phase-correct commit failure: before the commit nothing was written and no
 * receipt exists; after the commit the receipt names what already reached
 * the wire. The two are never confusable.
 */
export type ResponseFailure = Algebra<{
  beforeCommit: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  afterCommit: {
    readonly receipt: ResponseCommitAddress;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/**
 * The sole response-commit authority — scoped to the one request it was
 * granted for. The authority itself names the exact request; its commit and
 * open accept only plans for that request, and there is no method-level
 * generic to widen through. The identity parameter has no default. This
 * value is never carried broadly: the requirement hole carries only the
 * request-correlated `ResponseCommitGrant`, so every authority in a
 * consumer's hands was obtained by naming the exact request it serves.
 */
export interface ResponseCommitAuthority<Id extends EdgeRequestId> {
  readonly request: EdgeRequestReference<Id>;
  readonly commit: (plan: ResponsePlan<Id>) => Result<CommittedResponse<Id>, ResponseFailure>;
  readonly open: (plan: ResponsePlan<Id>) => Result<ResponseStream<Id>, ResponseFailure>;
}

/** Narrow invocation authority over the physical response writer — same exact request. */
export interface ResponseFacility<Id extends EdgeRequestId> {
  readonly request: EdgeRequestReference<Id>;
}

/**
 * The capability the requirement hole actually carries. It is deliberately
 * NOT a commit-capable authority: a static requirement row cannot name a
 * per-invocation fresh request identity, so a broad authority in the hole
 * would erase exactly the scoping the laws prove. Instead the carried
 * contract is a request-correlated grant — a consumer must name an exact
 * request reference to obtain the commit authority, and the authority it
 * receives accepts only that request's plans. There is no broad `commit` to
 * reach through the requirement contract.
 *
 * That the grant answers only the request its own invocation admitted is the
 * named `system/assurance` obligation `response-commit-request-agreement`.
 * Its genuine nonconforming witness: inside invocation A's realization, a
 * grant call naming request B's reference compiles — request references are
 * data, and no local generic law can distinguish the invocation's own
 * reference from a smuggled one. The runtime provider must refuse it.
 */
export interface ResponseCommitGrant {
  readonly grant: <Id extends EdgeRequestId>(
    request: EdgeRequestReference<Id>,
  ) => Result<ResponseCommitAuthority<Id>, ResponseFailure>;
}

export type ResponseFacilityRequirement = Hole<
  'liteship.edge.response-facility',
  ResponseFacility<EdgeRequestId>
>;
export type ResponseCommitRequirement = Hole<'liteship.edge.response-commit', ResponseCommitGrant>;

/** Invocation grounding: the response writer belongs to the invocation. */
export interface ResponseFacilityGrounding
  extends EdgeGroundingDefinition<
    readonly [ResponseFacilityRequirement],
    unknown,
    'invocation',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.response-facility'>;
}

/** Constructing the commit authority: policy-bound, single writer. */
export interface ResponseCommitOffer
  extends EdgeRealizationOffer<
    readonly [ResponseCommitRequirement],
    readonly [ResponseFacilityRequirement, EdgePolicyRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.response-commit'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

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
      ResponseStream<EdgeRequestId>['finish'],
    ],
    [
      (
        plan: ResponsePlan<EdgeRequestId<'liteship.edge.law.request-a'>>,
      ) => Result<CommittedResponse<EdgeRequestId<'liteship.edge.law.request-a'>>, ResponseFailure>,
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      EdgeRequestReference<EdgeRequestId<'liteship.edge.law.request-a'>>,
      false,
      false,
      Signature<ResponsePlan<EdgeRequestId>, CommittedResponse<EdgeRequestId>, NonEmptyTuple<Diagnostic>>,
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

/** Type summary consumed by the edge topology. */
export interface EdgeResponseTypeSurface {
  readonly plan: ResponsePlan<EdgeRequestId>;
  readonly committed: CommittedResponse<EdgeRequestId>;
  readonly stream: ResponseStream<EdgeRequestId>;
  readonly failure: ResponseFailure;
  readonly authority: ResponseCommitAuthority<EdgeRequestId>;
  readonly grant: ResponseCommitGrant;
  readonly facility: ResponseFacilityGrounding;
  readonly commitOffer: ResponseCommitOffer;
}

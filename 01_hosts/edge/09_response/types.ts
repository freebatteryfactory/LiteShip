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
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
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
/** Stable identity for one response stream. */
export type ResponseStreamId<Name extends string = string> = Brand<Name, 'liteship.edge.response-stream-id'>;
/** Typed reference to one response stream. */
export type ResponseStreamReference<Id extends ResponseStreamId = ResponseStreamId> = Reference<
  'edge-response-stream',
  Id
>;

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
export interface ResponseStream<Id extends EdgeRequestId, Stream extends ResponseStreamId = ResponseStreamId> {
  readonly id: ResponseStreamReference<Stream>;
  readonly plan: ResponsePlan<Id>;
  readonly buffer: ResponseBufferBound;
  readonly write: Signature<EdgeEncodedChunk, ResponseBufferBound, NonEmptyTuple<Diagnostic>>;
  readonly cancel: Signature<
    ResponseStreamReference<Stream>,
    CancellationReceipt<ResponseStreamReference<Stream>>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly finish: Signature<ResponseStreamReference<Stream>, CommittedResponse<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Opening one response stream names the fresh per-use stream identity. */
export interface ResponseStreamOpenRequest<Id extends EdgeRequestId, Stream extends ResponseStreamId> {
  readonly stream: ResponseStreamReference<Stream>;
  readonly plan: ResponsePlan<Id>;
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
  readonly open: <Stream extends ResponseStreamId>(
    request: ResponseStreamOpenRequest<Id, Stream>,
  ) => Result<ResponseStream<Id, Stream>, ResponseFailure>;
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

/** Capability requirement for response facility. */
export type ResponseFacilityRequirement = Hole<
  'liteship.edge.response-facility',
  ResponseFacility<EdgeRequestId>
>;
/** Capability requirement for response commit. */
export type ResponseCommitRequirement = Hole<'liteship.edge.response-commit', ResponseCommitGrant>;

/** Invocation grounding: the response writer belongs to the invocation. */
export interface ResponseFacilityGrounding
  extends EdgeGroundingDefinition<
    readonly [ResponseFacilityRequirement],
    ResponseFacility<EdgeRequestId>,
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

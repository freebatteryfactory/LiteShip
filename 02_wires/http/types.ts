/**
 * The HTTP wire: request and response across address spaces.
 *
 * This is the wire the umbrella was written to survive. Every boundary
 * vocabulary in common use is HTTP-shaped, and the shape is wrong in one
 * specific, expensive way: a status code is a single value asked to carry both
 * *what happened to the crossing* and *what the operation decided*. Those are
 * different questions and the answer to one does not constrain the other.
 *
 * A `500` hides a malformed request. A `200` hides an operation that refused.
 * A gateway timeout reads as a business failure. And the one that costs money:
 * a client that treats a lost answer as a failed operation and retries without
 * the idempotency key runs it twice.
 *
 * So this home owns the projection and refuses to let it collapse. A status
 * class is chosen *per crossing arm*, and two of the three arms have exactly one
 * legal class. What varies is the arm where variation is real: an operation that
 * ran, whose outcome is its own business.
 *
 * It narrows nothing. `direct` could `Extract` its way to two arms because
 * in-process invocation genuinely cannot lose an answer; HTTP can produce every
 * arm the umbrella declares, and a law below pins that so a later edit cannot
 * quietly decide otherwise.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  CaseOf,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { IdempotencyKey, OperationId } from '../../00_core/07_operation/types.js';
import type { WireExchange, WireRefusal } from '../types.js';

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * The status *class*, not the code.
 *
 * Three digits are a protocol detail with an owner outside this repository. The
 * class is the semantic content, and it is the level at which the projection
 * below can be constrained: `404` versus `400` is a refinement of one decision,
 * while `4xx` versus `5xx` is the decision.
 */
export type HttpStatusClass =
  | 'informational'
  | 'success'
  | 'redirection'
  | 'client-error'
  | 'server-error';

/**
 * What a method promises about repetition.
 *
 * Not a list of verbs. `GET` and `HEAD` are safe, `PUT` and `DELETE` are
 * idempotent, `POST` is neither, and enumerating the verbs here would restate a
 * specification this repository does not own. What has no owner upstream is the
 * consequence: whether a lost answer may be retried without an idempotency key.
 */
export type HttpMethodSafety = 'safe' | 'idempotent' | 'unsafe';

/**
 * Whether the caller may send the request again.
 *
 * This exists only on the lost arm of the projection, because it is only a
 * question there. A crossing that never reached an operation may always be
 * retried — nothing happened. A crossing that completed has its answer. A
 * crossing whose answer was lost is the one case where the operation ran and
 * the caller does not know what it did.
 *
 * The `forbidden` arm is the point of the whole type. An unsafe method with no
 * idempotency key, whose answer was lost, is a request that must not be sent
 * again by anyone, ever, and it needs a name so that a client can branch on it
 * rather than guess. The industry default is to have no name for this and retry
 * anyway.
 */
export type HttpRetryEligibility = Algebra<{
  free: { readonly safety: 'safe' | 'idempotent' };
  keyed: { readonly idempotencyKey: IdempotencyKey };
  forbidden: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * How one boundary crossing becomes an HTTP response.
 *
 * Each arm carries the exact crossing arm it projects, so the correspondence is
 * construction rather than convention, and the status class is pinned wherever
 * only one class is honest:
 *
 * - `rejected` projects a crossing that never became an invocation. It is
 *   always a client error, because the client sent something this wire could not
 *   turn into a call. It carries no receipt, because there is nothing to have a
 *   receipt of.
 * - `lost` projects a crossing whose operation *ran* and whose answer did not
 *   arrive. It is always a server error. It may never be a client error: the
 *   client did nothing wrong, and telling it so invites the retry that runs the
 *   operation twice.
 * - `answered` projects a crossing that completed. Its status class is genuinely
 *   free, because it is a function of the receipt's outcome and not of the
 *   transport. An operation that refused is `client-error` with a receipt; one
 *   that failed is `server-error` with a receipt; both *arrived*.
 *
 * That last freedom is the one thing here that must not be constrained. A
 * grammar forcing `completed` to `success` is how an operation's refusal becomes
 * invisible, and it is the most common single defect in HTTP API design.
 */
export type HttpProjection<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Algebra<{
  answered: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'completed'>;
    readonly status: HttpStatusClass;
  };
  rejected: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'refused'>;
    readonly status: 'client-error';
  };
  lost: {
    readonly crossing: CaseOf<WireExchange<Output, Failure, Op>, 'undelivered'>;
    readonly status: 'server-error';
    readonly retry: HttpRetryEligibility;
  };
}>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type HttpLawA = OperationId<'liteship.wire.http.law.op-a'>;
type HttpLawB = OperationId<'liteship.wire.http.law.op-b'>;

/**
 * Compile-time law: HTTP narrows nothing.
 *
 * `direct` reaches two exchange arms because in-process invocation genuinely
 * cannot lose an answer or fail to decode. HTTP reaches all three and both
 * refusals, and pinning that is what stops a later edit deciding the awkward arm
 * is not needed here either.
 *
 * The negative lines are the ones that bite: an `Extract` down to two arms would
 * satisfy a law that only checked the arms present.
 */
export type TheHttpWireNarrowsNothing = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<WireExchange>, 'completed' | 'refused' | 'undelivered'>,
        Equal<TagOf<WireRefusal>, 'malformed' | 'unrecognized'>,
        Equal<TagOf<HttpProjection>, 'answered' | 'rejected' | 'lost'>,
        Exclude<TagOf<WireExchange>, 'completed' | 'refused' | 'undelivered'> extends never
          ? true
          : false,
      ],
      [true, true, true, true]
    >
  >
>;

/**
 * Compile-time law: the status class is pinned where only one is honest, and
 * free where the transport does not know.
 *
 * Lines one and two are the refusals. A lost answer reported as a client error
 * is the single most expensive mistranslation available at this boundary, and a
 * rejected request reported as success is how a 200 comes to mean nothing.
 *
 * Line three is the freedom, and it is as load-bearing as the constraints. A
 * completed crossing whose operation refused must be able to say `client-error`
 * while carrying its receipt; a grammar that forced `success` here would make an
 * operation's own refusal unrepresentable at the boundary.
 */
export type AStatusClassIsPinnedWhereOnlyOneIsHonest = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<HttpProjection, 'lost'>['status'], 'server-error'>,
        Equal<CaseOf<HttpProjection, 'rejected'>['status'], 'client-error'>,
        Equal<CaseOf<HttpProjection, 'answered'>['status'], HttpStatusClass>,
        HttpStatusClass extends CaseOf<HttpProjection, 'lost'>['status'] ? true : false,
        'client-error' extends CaseOf<HttpProjection, 'lost'>['status'] ? true : false,
      ],
      [true, true, true, false, false]
    >
  >
>;

/**
 * Compile-time law: retry eligibility exists only where the operation ran.
 *
 * A rejected crossing never reached an operation, so retrying it is free and
 * needs no member to say so; an answered crossing has its answer. Putting
 * `retry` on either would invite a client to consult it, and a member that is
 * always the same answer is a member that gets read wrong eventually.
 *
 * Line four is the one that has to exist: an unsafe method with no idempotency
 * key, whose answer was lost, must be nameable. The default across the industry
 * is that it has no name and the client retries.
 */
export type RetryEligibilityExistsOnlyWhereTheOperationRan = Assert<
  IsExactlyTrue<
    Equal<
      [
        'retry' extends keyof CaseOf<HttpProjection, 'lost'> ? true : false,
        'retry' extends keyof CaseOf<HttpProjection, 'rejected'> ? true : false,
        'retry' extends keyof CaseOf<HttpProjection, 'answered'> ? true : false,
        Equal<TagOf<HttpRetryEligibility>, 'free' | 'keyed' | 'forbidden'>,
        Equal<CaseOf<HttpRetryEligibility, 'keyed'>['idempotencyKey'], IdempotencyKey>,
      ],
      [true, false, false, true, true]
    >
  >
>;

/**
 * Compile-time law: a projection is exact over the operation it projects.
 *
 * The third line is the anti-vacuity partner. Without it the law passes when the
 * projection stops threading its parameter, because everything is assignable to
 * the default instantiation — the defect this repository has now committed five
 * separate times.
 */
export type AnHttpProjectionIsExactOverItsOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        HttpProjection<unknown, readonly Diagnostic[], HttpLawA> extends HttpProjection<
          unknown,
          readonly Diagnostic[],
          HttpLawB
        >
          ? true
          : false,
        HttpProjection<unknown, readonly Diagnostic[], HttpLawA> extends HttpProjection<
          unknown,
          readonly Diagnostic[],
          HttpLawA
        >
          ? true
          : false,
        HttpProjection extends HttpProjection<unknown, readonly Diagnostic[], HttpLawA>
          ? true
          : false,
      ],
      [false, true, false]
    >
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the wire topology. */
export interface HttpWireTypeSurface {
  readonly statusClass: HttpStatusClass;
  readonly safety: HttpMethodSafety;
  readonly retry: HttpRetryEligibility;
  readonly projection: HttpProjection;
}

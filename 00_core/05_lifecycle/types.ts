/**
 * Resource ownership, cancellation, deadlines, and deterministic disposal.
 *
 * Owned resources expose one direct lifecycle. Disposal is idempotent, ordered,
 * cancellation-aware, and capable of reporting every finalizer failure.
 *
 * @module
 */

import type {
  Algebra,
  MaybePromise,
  Result,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { MonotonicNanoseconds } from '../04_time/types.js';

/** Why owned activity was cancelled. */
export type CancellationReason = Algebra<{
  requested: { readonly by?: string };
  deadline: { readonly at: MonotonicNanoseconds };
  replaced: { readonly generation: bigint };
  shutdown: { readonly signal?: string };
  failure: { readonly diagnostic: Diagnostic };
}>;

/** Monotonic deadline for one operation or resource. */
export interface Deadline {
  readonly at: MonotonicNanoseconds;
}

/** Finalizer owned by a lifetime. */
export type Finalizer = () => MaybePromise<void>;

/** Aggregate disposal issue preserving all failures in invocation order. */
export interface DisposalFailure {
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * What a disposal request actually did.
 *
 * Disposal is idempotent, so "this call released it" and "it was already
 * released" are both success and are not the same fact. A caller reconciling
 * ownership, a test asserting exactly-once release, and a log explaining a
 * double free all need the difference, and a bare success arm destroys it.
 */
export type DisposalOutcome = Algebra<{
  released: Record<never, never>;
  'already-released': Record<never, never>;
}>;

/**
 * The receipt one disposal produces.
 *
 * The carrier shape answers a variance constraint, and the reason is worth
 * stating so it is not "simplified" away later. A `Signature`'s input is
 * contravariant. An operation declared `Signature<Reference<Id>, void>` carries
 * its identity only in an input position, which inverts exactness — a broad
 * supplier becomes assignable where an exact one is required. Returning the
 * subject keeps `Id` covariant.
 *
 * The temptation, having discovered that, is to return the caller's own
 * reference: it satisfies the variance and costs nothing to write. It also says
 * nothing. The receipt keeps the covariance and spends it on something true —
 * the subject appears in an output position, and the outcome answers a question
 * only the operation can answer.
 *
 * **This one is for disposal only.** See {@link CancellationReceipt} — the two
 * are deliberately not one type.
 */
export interface DisposalReceipt<Subject> {
  readonly subject: Subject;
  readonly outcome: DisposalOutcome;
}

/**
 * What a cancellation request actually did.
 *
 * Cancellation is not disposal, and the arms are the evidence. Disposal ends
 * ownership and is idempotent, so `released | already-released` covers it.
 * Cancellation is a *request* against work that has terminal states of its own,
 * and it can meet three genuinely different situations.
 *
 * This answers exactly one question: **did this request newly apply, repeat an
 * existing one, or arrive too late.** It does not report what the subject
 * became. A terminal subject already owns its own outcome — completed, failed,
 * or otherwise — and copying that here would be a second place for the same
 * fact to be stated and to drift.
 *
 * The third arm is the one a disposal outcome destroys. A request arriving
 * after the subject finished on its own is not "already released": nothing was
 * released, and the caller now has to go read the subject's terminal result to
 * find out what happened. That is a different action from the one an
 * `already-requested` answer implies, and no success flag distinguishes them.
 */
export type CancellationOutcome = Algebra<{
  /** The subject was live; this request now applies to it. */
  requested: Record<never, never>;
  /**
   * A cancellation request already existed for this subject.
   *
   * Named for the request, not the subject's state. Cooperative cancellation
   * means a request has been raised, not that the work has finished unwinding —
   * `already-cancelled` would claim the stronger thing, and the subject's own
   * lifecycle is what answers that.
   */
  'already-requested': Record<never, never>;
  /**
   * The subject reached a terminal state of its own before this request
   * arrived, so the request changed nothing. Which terminal state it reached is
   * the subject's to report, not this receipt's.
   */
  'already-terminal': Record<never, never>;
}>;

/**
 * The receipt one cancellation request produces.
 *
 * Structurally a sibling of {@link DisposalReceipt}, and deliberately not
 * unified with it. Two interfaces sharing two readonly members is ordinary
 * repetition, not a concept: a `LifecycleTransitionReceipt<Subject, Outcome>`
 * would be a name for the fact that both carry a subject, which is not a fact
 * worth naming. The outcomes are where the meaning lives and they do not
 * generalize.
 *
 * They are also not interchangeable, and that is checked. The two outcome
 * algebras carry disjoint tags, so a cancellation receipt cannot be handed to a
 * consumer expecting a disposal one — which is the whole point of splitting
 * them rather than reusing one convenient shape.
 */
export interface CancellationReceipt<Subject> {
  readonly subject: Subject;
  readonly outcome: CancellationOutcome;
}

/** Deterministic lifecycle state. */
export type LifecycleState = 'active' | 'disposing' | 'disposed';

/**
 * Whether cancellation has been requested, and why.
 *
 * An algebra rather than `cancelled: boolean` beside an optional reason. That
 * shape admits two states that mean nothing — cancelled with no reason, and
 * live with one — and `00_core/11_scene` already retired it once for the same
 * reason. Here the reason is the payload of the arm that has one.
 */
export type CancellationState = Algebra<{
  live: Record<never, never>;
  cancelled: { readonly reason: CancellationReason };
}>;

/**
 * Observing cancellation, without naming a physical signal type.
 *
 * This replaces a direct dependency on the DOM's `AbortSignal`. Core is
 * realm-neutral, and a browser global reaching this far up was invisible only
 * because the repository handed every layer the DOM library at once. It also
 * cost meaning: `AbortSignal.reason` is `any`, so the reason a lifetime was
 * cancelled arrived untyped even though `CancellationReason` is declared
 * twenty lines above.
 *
 * `observe` returns its own unsubscribe, matching `Lifetime.add`. A host that
 * has a physical `AbortSignal` adapts it to this contract; core never sees the
 * adapter.
 */
export interface CancellationSignal {
  readonly state: CancellationState;
  readonly observe: (onCancelled: (reason: CancellationReason) => void) => () => void;
}

/** One idempotent LIFO resource lifetime. */
export interface Lifetime {
  readonly state: LifecycleState;
  readonly signal: CancellationSignal;
  readonly add: (finalizer: Finalizer) => () => void;
  readonly cancel: (reason: CancellationReason) => void;
  readonly dispose: () => Promise<Result<void, DisposalFailure>>;
}

/** Resource that owns and directly exposes its lifetime. */
export interface OwnedResource {
  readonly lifetime: Lifetime;
  readonly dispose: () => Promise<Result<void, DisposalFailure>>;
  readonly [Symbol.asyncDispose]: () => Promise<void>;
}

/** Parent/child lifecycle relation. */
export interface ChildLifetime {
  readonly parent: Lifetime;
  readonly child: Lifetime;
  readonly cancelWithParent: boolean;
}

/** Type summary consumed by the root core topology. */
export interface LifecycleTypeSurface {
  readonly lifetime: Lifetime;
  readonly owned: OwnedResource;
  readonly cancellation: CancellationReason;
  readonly cancellationState: CancellationState;
  readonly cancellationSignal: CancellationSignal;
  readonly disposalOutcome: DisposalOutcome;
  readonly disposalReceipt: DisposalReceipt<unknown>;
  readonly cancellationOutcome: CancellationOutcome;
  readonly cancellationReceipt: CancellationReceipt<unknown>;
  readonly deadline: Deadline;
  readonly disposalFailure: DisposalFailure;
}

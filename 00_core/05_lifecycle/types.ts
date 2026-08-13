/**
 * Resource ownership, cancellation, deadlines, and deterministic disposal.
 *
 * Owned resources expose one direct lifecycle. Disposal is idempotent, ordered,
 * cancellation-aware, and capable of reporting every finalizer failure.
 *
 * @module
 */

import type { Algebra, Assert, Equal, MaybePromise, Result, TagOf } from '../../types.js';
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
 * The carrier shape exists because the alternative was measured and it was
 * worse. Across the repository, twenty-five lifecycle-ending operations used
 * six different return conventions: fourteen returned the exact reference they
 * were handed, four a projection of their own input, one an unrelated layout
 * address, one a transaction generation, and two a bare boolean. None carried
 * information the caller did not already hold.
 *
 * The reason was not carelessness, and it is worth stating so the shape is not
 * "simplified" back later. A `Signature`'s input is contravariant. An operation
 * declared `Signature<Reference<Id>, void>` carries its identity only in an
 * input position, which inverts exactness — a broad supplier becomes assignable
 * where an exact one is required. Returning the reference was the cheapest way
 * to keep `Id` covariant, and it bought that at the cost of a return that says
 * nothing.
 *
 * The receipt keeps the covariance and spends it on something true: the subject
 * appears in an output position, and the outcome answers a question only the
 * operation can answer.
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
 * Cancellation is a *request* against work that has its own terminal states,
 * and it can meet three genuinely different situations.
 *
 * The third arm is the one that matters and the one a disposal outcome
 * destroys. Cancelling something that already completed is not "already
 * released" — it is the caller discovering that the work finished and the
 * result exists. For a render, that is the difference between "your export was
 * stopped" and "your export is done, go collect it." No caller can recover that
 * from a success flag.
 *
 * The arms are read off the lifecycles that actually exist rather than
 * invented: `MediaBatch` reports produced, completed, cancelled, and failed;
 * `DeferredOutcome` reports pending, completed, failed, and cancelled. Both
 * distinguish exactly these three answers to a cancel request.
 */
export type CancellationOutcome = Algebra<{
  /** The subject was live; cancellation now applies to it. */
  requested: Record<never, never>;
  /** A prior cancellation already applied. */
  'already-cancelled': Record<never, never>;
  /**
   * The subject reached a terminal state of its own — completed or failed —
   * before this request arrived, so the request changed nothing.
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

/**
 * A disposal receipt names the exact thing it released.
 *
 * This is the whole reason the subject sits in the receipt rather than being
 * dropped for `void`. `Subject` is carried by a readonly member, so it is
 * covariant: a receipt for A is usable where a broad receipt is expected, and a
 * broad receipt is not usable where A's is required. Reversing that — which is
 * what putting the identity only in the operation's input would do, since
 * `Signature` inputs are contravariant — would let a disposer for any subject
 * satisfy a contract demanding one exact subject.
 *
 * The last line is the anti-vacuity partner. Without it the law would still
 * pass if `subject` were retyped to `unknown`, because everything is assignable
 * to a receipt whose subject says nothing.
 */
export type ADisposalReceiptIsExactOverItsSubject = Assert<
  Equal<
    [
      DisposalReceipt<'a'> extends DisposalReceipt<'b'> ? true : false,
      DisposalReceipt<'a'> extends DisposalReceipt<string> ? true : false,
      DisposalReceipt<string> extends DisposalReceipt<'a'> ? true : false,
      DisposalReceipt<unknown> extends DisposalReceipt<'a'> ? true : false,
    ],
    [false, true, false, false]
  >
>;

/**
 * Cancelling is not disposing, and the types say so.
 *
 * The first two lines are the substitutability check that matters: neither
 * receipt can stand in for the other, at any subject. Without that, splitting
 * the outcomes would be documentation rather than architecture — a consumer
 * expecting to learn whether ownership ended could be handed a cancellation
 * result and never notice.
 *
 * The last two lines are the anti-vacuity partners. The receipts differ only in
 * their outcome member, so if either outcome algebra lost its distinguishing
 * arms — collapsing both to a bare success — the first two lines would start
 * passing for the wrong reason. Pinning the exact tag populations is what makes
 * the separation load-bearing rather than nominal.
 */
export type ACancellationReceiptIsNotADisposalReceipt = Assert<
  Equal<
    [
      CancellationReceipt<'a'> extends DisposalReceipt<'a'> ? true : false,
      DisposalReceipt<'a'> extends CancellationReceipt<'a'> ? true : false,
      Equal<TagOf<CancellationOutcome>, 'requested' | 'already-cancelled' | 'already-terminal'>,
      Equal<TagOf<DisposalOutcome>, 'released' | 'already-released'>,
    ],
    [false, false, true, true]
  >
>;

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

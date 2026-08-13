/**
 * Resource ownership, cancellation, deadlines, and deterministic disposal.
 *
 * Owned resources expose one direct lifecycle. Disposal is idempotent, ordered,
 * cancellation-aware, and capable of reporting every finalizer failure.
 *
 * @module
 */

import type { Algebra, Assert, Equal, MaybePromise, Result } from '../../types.js';
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
 * This exists because the alternative was measured and it was worse. Across the
 * repository, twenty-five disposal and cancellation operations used six
 * different return conventions: fourteen returned the exact reference they were
 * handed, four returned a projection of their own input, one returned an
 * unrelated layout address, one a transaction generation, and two a bare
 * boolean. None of them carried information the caller did not already have.
 *
 * The reason was not carelessness, and it is worth stating so the shape is not
 * "simplified" back later. A `Signature`'s input is contravariant. An operation
 * declared `Signature<Reference<Id>, void>` carries its identity only in an
 * input position, which inverts exactness — a broad supplier becomes assignable
 * where an exact one is required. Returning the reference was the cheapest way
 * to keep `Id` covariant, and it bought that at the cost of a return value that
 * says nothing.
 *
 * The receipt keeps the covariance and spends it on something true: the subject
 * appears in an output position, and the outcome answers a question only the
 * disposer can answer.
 */
export interface DisposalReceipt<Subject> {
  readonly subject: Subject;
  readonly outcome: DisposalOutcome;
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

/** Type summary consumed by the root core topology. */
export interface LifecycleTypeSurface {
  readonly lifetime: Lifetime;
  readonly owned: OwnedResource;
  readonly cancellation: CancellationReason;
  readonly cancellationState: CancellationState;
  readonly cancellationSignal: CancellationSignal;
  readonly disposalOutcome: DisposalOutcome;
  readonly disposalReceipt: DisposalReceipt<unknown>;
  readonly deadline: Deadline;
  readonly disposalFailure: DisposalFailure;
}

/**
 * Resource ownership, cancellation, deadlines, and deterministic disposal.
 *
 * Owned resources expose one direct lifecycle. Disposal is idempotent, ordered,
 * cancellation-aware, and capable of reporting every finalizer failure.
 *
 * @module
 */

import type { Algebra, MaybePromise, Result } from '../../types.js';
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
  readonly deadline: Deadline;
  readonly disposalFailure: DisposalFailure;
}

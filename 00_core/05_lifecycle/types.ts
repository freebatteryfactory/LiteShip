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

/** One idempotent LIFO resource lifetime. */
export interface Lifetime {
  readonly state: LifecycleState;
  readonly signal: AbortSignal;
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
  readonly deadline: Deadline;
  readonly disposalFailure: DisposalFailure;
}

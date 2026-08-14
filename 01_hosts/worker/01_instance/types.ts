/**
 * The live worker realm after bootstrap.
 *
 * This home owns the instance the admitted realm has become: its identity,
 * lifecycle state, readiness, crash and withdrawal evidence, graceful close,
 * and disposal. It does not own the parent-side constructor — construction is
 * the parent realm's facility, and the target-generated module or URL is a
 * downstream artifact. Termination requested by the parent arrives as a
 * physical fact this realm observes; graceful close is the one lifecycle
 * transition this realm itself authors.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  NonEmptyTuple,
  Reference,
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { MonotonicNanoseconds } from '../../../00_core/04_time/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { WorkerBootstrapEnvelope } from '../00_bootstrap/types.js';

export type WorkerInstanceId<Name extends string = string> = Brand<
  Name,
  'liteship.worker.instance-id'
>;
export type WorkerInstanceReference<Id extends WorkerInstanceId = WorkerInstanceId> = Reference<
  'worker-instance',
  Id
>;

/**
 * The lifecycle of one live worker realm. Every arm is phase-correct:
 * readiness is not activity, a crash is not a close, parent-requested
 * termination is not this realm's own graceful close, and withdrawal of the
 * realm by the platform is its own fact.
 */
export type WorkerLifecycleState = Algebra<{
  /** Bootstrap admitted; not yet ready to accept work. */
  admitted: Record<never, never>;
  /** Ready and accepting work. */
  ready: { readonly since: MonotonicNanoseconds };
  /** This realm is draining and will close itself. */
  closing: Record<never, never>;
  /** This realm closed gracefully and recorded its receipt. */
  closed: { readonly receipt: ContentAddress<'application/vnd.liteship.worker-close+cbor'> };
  /** The parent terminated the realm; no worker-side receipt exists. */
  terminated: Record<never, never>;
  /** The realm crashed; diagnostics are the evidence. */
  crashed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /** The platform withdrew the realm. */
  withdrawn: Record<never, never>;
}>;

/**
 * The live instance: one owned resource whose identity, entry envelope, and
 * lifecycle live together, generic over its exact identity with no erasing
 * default. `close` is the only worker-authored exit, and it closes exactly
 * this instance — instance A's close structurally cannot accept instance B.
 */
export interface WorkerInstance<Id extends WorkerInstanceId> {
  readonly id: WorkerInstanceReference<Id>;
  readonly entry: WorkerBootstrapEnvelope;
  readonly state: WorkerLifecycleState;
  readonly close: Signature<
    WorkerInstanceReference<Id>,
    ContentAddress<'application/vnd.liteship.worker-close+cbor'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Type summary consumed by the worker topology. */
export interface WorkerInstanceTypeSurface {
  readonly instance: WorkerInstance<WorkerInstanceId>;
  readonly state: WorkerLifecycleState;
}

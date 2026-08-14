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
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
  Reference,
  Signature,
  TagOf,
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

// ---------------------------------------------------------------------------
// Laws
//
// That disposal happens exactly once, that crash and withdrawal produce
// correct evidence and receipts, and that actual parent termination is
// distinguishable from close at runtime are `system/assurance` obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: the lifecycle arms are exactly the declared set. */
export type TheLifecycleArmsAreExact = Assert<
  Equal<
    TagOf<WorkerLifecycleState>,
    'admitted' | 'ready' | 'closing' | 'closed' | 'terminated' | 'crashed' | 'withdrawn'
  >
>;

/** Compile-time law: a crash carries evidence; a graceful close carries its receipt. */
export type CrashAndCloseCarryTheirEvidence = Assert<
  Equal<
    [
      CaseOf<WorkerLifecycleState, 'crashed'>['diagnostics'],
      CaseOf<WorkerLifecycleState, 'closed'>['receipt'],
    ],
    [NonEmptyTuple<Diagnostic>, ContentAddress<'application/vnd.liteship.worker-close+cbor'>]
  >
>;

/** Compile-time law: the instance is owned and its entry is the exact bootstrap envelope. */
export type TheInstanceOwnsItsEntry = Assert<
  Equal<
    [WorkerInstance<WorkerInstanceId>['lifecycle'], WorkerInstance<WorkerInstanceId>['entry']],
    [CaseOf<RealizationLifecycle, 'owned'>, WorkerBootstrapEnvelope]
  >
>;

/**
 * Compile-time law: an instance closes exactly itself — instance A's close
 * accepts only instance A's reference, and an instance of B is not an
 * instance of A.
 */
export type AnInstanceClosesExactlyItself = Assert<
  Equal<
    [
      WorkerInstance<WorkerInstanceId<'liteship.worker.law.instance-a'>>['close'],
      WorkerInstance<WorkerInstanceId<'liteship.worker.law.instance-b'>> extends WorkerInstance<
        WorkerInstanceId<'liteship.worker.law.instance-a'>
      >
        ? true
        : false,
    ],
    [
      Signature<
        WorkerInstanceReference<WorkerInstanceId<'liteship.worker.law.instance-a'>>,
        ContentAddress<'application/vnd.liteship.worker-close+cbor'>,
        NonEmptyTuple<Diagnostic>
      >,
      false,
    ]
  >
>;

/** Type summary consumed by the worker topology. */
export interface WorkerInstanceTypeSurface {
  readonly instance: WorkerInstance<WorkerInstanceId>;
  readonly state: WorkerLifecycleState;
}

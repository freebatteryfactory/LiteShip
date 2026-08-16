/**
 * Compile-time laws for `01_hosts/edge/10_deferred`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { MonotonicNanoseconds } from '../../../00_core/04_time/types.js';
import type { OperationInvocation } from '../../../00_core/07_operation/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Signature, TagOf } from '../../../types.js';
import type { EdgeInvocationContext } from '../00_bootstrap/types.js';
import type { DeferredBound, DeferredFacility, DeferredOutcome, DeferredTask, DeferredTaskReference, DeferredTaskRequest, DeferredWorkAuthority } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That deferred work remains bounded and correctly attributed at runtime is
// `system/assurance`; the work budget is empirical.
// ---------------------------------------------------------------------------

/**
 * Compile-time law: a task descends from its exact invocation, carries
 * actual work and an actual bound, and is owned. The bound arms are a real
 * algebra — flush-tied or deadline-carrying — never a contentless flag.
 */
export type ATaskDescendsFromItsInvocation = Assert<
  Equal<
    [
      DeferredTask['ancestry'],
      DeferredTask['work'],
      DeferredTask['bound'],
      TagOf<DeferredBound>,
      CaseOf<DeferredBound, 'deadline'>['at'],
      DeferredTask['lifecycle'],
    ],
    [
      EdgeInvocationContext['address'],
      OperationInvocation,
      DeferredBound,
      'untilFlush' | 'deadline',
      MonotonicNanoseconds,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;


/** Compile-time law: the outcome arms are phase-correct with completion receipts. */
export type DeferredOutcomesArePhaseCorrect = Assert<
  Equal<
    [TagOf<DeferredOutcome>, CaseOf<DeferredOutcome, 'completed'>['receipt']],
    [
      'pending' | 'completed' | 'failed' | 'cancelled',
      ContentAddress<'application/vnd.liteship.edge-deferred+cbor'>,
    ]
  >
>;


/** Compile-time law: enqueueing requires ancestry, work, scope, and bound together. */
export type EnqueueingRequiresAncestryAndScope = Assert<
  Equal<
    [
      DeferredWorkAuthority['enqueue'],
      DeferredTaskRequest['work'],
      DeferredTaskRequest['bound'],
    ],
    [
      Signature<DeferredTaskRequest, DeferredTask, NonEmptyTuple<Diagnostic>>,
      OperationInvocation,
      DeferredBound,
    ]
  >
>;

/** Compile-time law: the intrinsic grounding carries the platform defer operation. */
export type TheDeferredFacilityCanScheduleNotMerelyMark = Assert<
  Equal<
    DeferredFacility['defer'],
    Signature<DeferredTaskRequest, DeferredTaskReference, NonEmptyTuple<Diagnostic>>
  >
>;

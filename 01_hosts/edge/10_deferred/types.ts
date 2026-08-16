/**
 * Deferred work: explicitly bounded post-response tasks.
 *
 * This home owns the deferred-work authority: task identity, request
 * ancestry, the exact capability scope retained after the response, bounded
 * lifetime, cancellation behavior, completion and failure evidence, and
 * disposal. It must not smuggle an unbounded long-lived service model into
 * edge — a deferred task is invocation-descended, capability-scoped, and
 * finite by declaration.
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
  RequirementRow,
  Signature,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { MonotonicNanoseconds } from '../../../00_core/04_time/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { OperationInvocation } from '../../../00_core/07_operation/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { EdgeGroundingDefinition, EdgeRealizationOffer } from '../00_bootstrap/types.js';
import type { EdgeInvocationContext } from '../00_bootstrap/types.js';

export type DeferredTaskId<Name extends string = string> = Brand<
  Name,
  'liteship.edge.deferred-task-id'
>;
export type DeferredTaskReference<Id extends DeferredTaskId = DeferredTaskId> = Reference<
  'edge-deferred-task',
  Id
>;

/**
 * The actual lifetime bound of one deferred task: tied to the invocation's
 * flush, or a declared deadline coordinate. A bound is a fact, not a boolean
 * costume.
 */
export type DeferredBound = Algebra<{
  untilFlush: Record<never, never>;
  deadline: { readonly at: MonotonicNanoseconds };
}>;

/** The task outcome, phase-correct: completed with a receipt, failed, or cancelled. */
export type DeferredOutcome = Algebra<{
  pending: Record<never, never>;
  completed: { readonly receipt: ContentAddress<'application/vnd.liteship.edge-deferred+cbor'> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  cancelled: Record<never, never>;
}>;

/**
 * One deferred task: descended from the exact invocation, holding an exact
 * declared capability scope — never the whole realm — with a bounded
 * lifetime and an owned lifecycle.
 */
export interface DeferredTask {
  readonly id: DeferredTaskReference;
  readonly ancestry: EdgeInvocationContext['address'];
  readonly work: OperationInvocation;
  readonly scope: RequirementRow;
  readonly bound: DeferredBound;
  readonly outcome: DeferredOutcome;
  readonly cancel: Signature<
    DeferredTaskReference,
    CancellationReceipt<DeferredTaskReference>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete enqueue request: ancestry, actual work, scope, and bound — no naked deferral. */
export interface DeferredTaskRequest {
  readonly ancestry: EdgeInvocationContext['address'];
  readonly work: OperationInvocation;
  readonly scope: RequirementRow;
  readonly bound: DeferredBound;
}

/** The deferred-work provider: tasks are repeatable per-use resources. */
export interface DeferredWorkAuthority {
  readonly enqueue: Signature<DeferredTaskRequest, DeferredTask, NonEmptyTuple<Diagnostic>>;
}

/** Narrow intrinsic authority over the platform's post-response scheduling. */
export interface DeferredFacility {
  readonly defer: Signature<
    DeferredTaskRequest,
    DeferredTaskReference,
    NonEmptyTuple<Diagnostic>
  >;
}

export type DeferredFacilityRequirement = Hole<'liteship.edge.deferred-facility', DeferredFacility>;
export type DeferredWorkRequirement = Hole<'liteship.edge.deferred-work', DeferredWorkAuthority>;

/** Intrinsic grounding: the post-response scheduling machinery, admitted narrowly. */
export interface DeferredFacilityGrounding
  extends EdgeGroundingDefinition<
    readonly [DeferredFacilityRequirement],
    DeferredFacility,
    'intrinsic',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.edge.grounding.deferred-facility'>;
}

/** Constructing the deferred-work provider. */
export interface DeferredWorkOffer
  extends EdgeRealizationOffer<
    readonly [DeferredWorkRequirement],
    readonly [DeferredFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.edge.offer.deferred-work'>;
  readonly locations: NonEmptyTuple<'request'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the edge topology. */
export interface EdgeDeferredTypeSurface {
  readonly task: DeferredTask;
  readonly bound: DeferredBound;
  readonly outcome: DeferredOutcome;
  readonly authority: DeferredWorkAuthority;
  readonly facility: DeferredFacilityGrounding;
  readonly deferredOffer: DeferredWorkOffer;
}

/**
 * Browser residual-program execution host.
 *
 * Core owns residual-program meaning, memory plans, execution images, the
 * transactional fold, write plans, commit semantics, the TypeScript reference
 * behavior, and optimized backend contracts. This home owns the physical
 * browser side: instantiating the selected browser execution realization,
 * supplying browser scheduling, binding real backend drivers, and handing the
 * full `RuntimeCommit` to the projection seam.
 *
 * The local residual backend set is exactly what this home owns: javascript,
 * wasm, and webgpu. `html-css` is platform settlement that ended before
 * residual execution began, and `worker` is a sibling physical realm whose
 * lifecycle cannot be absorbed here — a concrete cross-realm worker
 * realization is declared at a downstream composition point that can import
 * both surfaces.
 *
 * @module
 */

import type {
  CaseOf,
  Hole,
  NonEmptyTuple,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { DisposalReceipt } from '../../../00_core/05_lifecycle/types.js';
import type {
  GroundingId,
  PreparationDisposition,
  PreparedWork,
  RealizationLifecycle,
  RealizationOfferId,
  SpeculativeCandidate,
} from '../../../00_core/14_compiler/types.js';
import type {
  ExecutionBackendDriver,
  ExecutionRequest,
  RuntimeCommit,
  RuntimeExecutor,
} from '../../../00_core/16_runtime/types.js';
import type { WebGroundingDefinition, WebPlacedBackend, WebRealizationOffer } from '../00_bootstrap/types.js';
import type { CommitApplicationRequirement, WebCommitAddress } from '../04_projection/types.js';

/**
 * Backends this home locally owns, derived from the bootstrap's placement
 * authority — exactly the residual browser backends. Trusted host execution,
 * the worker realm, and platform-settled `html-css` are excluded upstream.
 */
export type BrowserExecutionBackend = WebPlacedBackend;

/**
 * One backend bound to one driver whose own `kind` is that same backend —
 * distributively, so every member of the union preserves its own literal and
 * a javascript roster entry carrying a wasm driver is unrepresentable even at
 * the default type.
 */
type DriverBinding<Backend> = Backend extends BrowserExecutionBackend
  ? { readonly backend: Backend; readonly driver: ExecutionBackendDriver & { readonly kind: Backend } }
  : never;
/** Physical driver contract for bound. */
export type BoundDriver = DriverBinding<BrowserExecutionBackend>;

/**
 * The browser execution host: lawful backends bound to matching drivers, and
 * a real core `RuntimeExecutor` — it can actually execute a residual image
 * and produce a `RuntimeCommit`, rather than owning drivers it never uses.
 */
export interface WebExecutionHost {
  readonly drivers: NonEmptyTuple<BoundDriver>;
  readonly executor: RuntimeExecutor;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/**
 * Committed-output handoff: the full `RuntimeCommit` paired with the physical
 * web-commit address that applying it produced. Only commit application mints
 * that address; execution and scheduling never fabricate it.
 */
export interface CommittedOutputHandoff {
  readonly commit: RuntimeCommit;
  readonly applied: WebCommitAddress;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Narrow intrinsic authority over browser scheduling. It schedules work; its
 * output is the scheduled commit, not evidence that projection happened —
 * fabricating an applied address here would claim physical application
 * without the projection authority.
 */
export interface SchedulingFacility {
  readonly schedule: Signature<ExecutionRequest, ExecutionRequest, NonEmptyTuple<Diagnostic>>;
}

/** Capability requirement for scheduling facility. */
export type SchedulingFacilityRequirement = Hole<'liteship.web.scheduling-facility', SchedulingFacility>;
/** Capability requirement for web execution. */
export type WebExecutionRequirement = Hole<'liteship.web.execution', WebExecutionHost>;

/** Intrinsic grounding: the scheduling facility derived from the platform. */
export interface SchedulingFacilityGrounding
  extends WebGroundingDefinition<readonly [SchedulingFacilityRequirement], SchedulingFacility, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.scheduling-facility'>;
}

/**
 * Standing up the browser execution host is an offer requiring the scheduling
 * facility and the commit-application authority — the exact projection
 * authority its committed outputs are applied through. Execution cannot claim
 * the full path without possessing it.
 */
export interface ExecutionHostOffer
  extends WebRealizationOffer<
    readonly [WebExecutionRequirement],
    readonly [SchedulingFacilityRequirement, CommitApplicationRequirement],
    NonEmptyTuple<BrowserExecutionBackend>,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.execution-host'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript' | 'wasm' | 'webgpu'>;
}

// ---------------------------------------------------------------------------
// Speculative preparation
// ---------------------------------------------------------------------------

/**
 * The web preparation provider: it prepares predicted expensive consequences
 * — projection work, shader state, media state, island chunks, selected Wasm
 * paths — as revision-pinned, owned, cheaply disposable `PreparedWork` that
 * never mutates committed state and becomes visible only through the real
 * transaction commit.
 */
/** Prepared work meeting the one real commit that may make it visible. */
export interface PreparationConsumption {
  readonly prepared: PreparedWork;
  readonly commit: RuntimeCommit;
}

/** Authority governing web preparation. */
export interface WebPreparationAuthority {
  readonly prepare: Signature<SpeculativeCandidate, PreparedWork, NonEmptyTuple<Diagnostic>>;
  readonly consume: Signature<PreparationConsumption, PreparationDisposition, NonEmptyTuple<Diagnostic>>;
  readonly discard: Signature<
    PreparedWork,
    DisposalReceipt<PreparedWork['prepared']>,
    NonEmptyTuple<Diagnostic>
  >;
}

/** Capability requirement for preparation. */
export type PreparationRequirement = Hole<'liteship.web.preparation', WebPreparationAuthority>;

/** Standing up the preparation provider is an offer requiring scheduling. */
export interface PreparationOffer
  extends WebRealizationOffer<
    readonly [PreparationRequirement],
    readonly [SchedulingFacilityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.preparation'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the web topology. */
export interface WebExecutionTypeSurface {
  readonly host: WebExecutionHost;
  readonly handoff: CommittedOutputHandoff;
  readonly preparation: WebPreparationAuthority;
  readonly facility: SchedulingFacilityGrounding;
  readonly offer: ExecutionHostOffer;
  readonly preparationOffer: PreparationOffer;
}

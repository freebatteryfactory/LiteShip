/**
 * Compile-time laws for `01_hosts/web/10_execution`.
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

import type { PreparationDisposition, PreparedWork, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ExecutionBackendDriver, ExecutionRequest, RuntimeCommit } from '../../../00_core/16_runtime/types.js';
import type { Assert, Equal, InputOf, NonEmptyTuple, OutputOf } from '../../../types.js';
import type { CommitApplicationRequirement } from '../04_projection/types.js';
import type { BoundDriver, BrowserExecutionBackend, CommittedOutputHandoff, ExecutionHostOffer, PreparationConsumption, SchedulingFacility, SchedulingFacilityRequirement, WebExecutionHost, WebPreparationAuthority } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Backend crossover profiles are empirical and measured, never declared.
// ---------------------------------------------------------------------------

/** Compile-time law: the local set is exactly the residual browser backends. */
export type TheLocalBackendSetIsExactlyResidual = Assert<
  Equal<
    [
      'server' extends BrowserExecutionBackend ? true : false,
      'host-native' extends BrowserExecutionBackend ? true : false,
      'worker' extends BrowserExecutionBackend ? true : false,
      'html-css' extends BrowserExecutionBackend ? true : false,
      BrowserExecutionBackend,
    ],
    [false, false, false, false, 'javascript' | 'wasm' | 'webgpu']
  >
>;


/**
 * Compile-time law: backend and driver kind cannot disagree even at the
 * default union — the binding distributes, so a javascript entry carrying a
 * wasm driver is not a member of `BoundDriver` at all.
 */
export type ABackendAndItsDriverCannotDisagree = Assert<
  Equal<
    [
      WebExecutionHost['drivers'],
      {
        readonly backend: 'javascript';
        readonly driver: ExecutionBackendDriver & { readonly kind: 'wasm' };
      } extends BoundDriver
        ? true
        : false,
    ],
    [NonEmptyTuple<BoundDriver>, false]
  >
>;


/** Compile-time law: the host can actually execute, producing the runtime commit. */
export type TheHostActuallyExecutes = Assert<
  Equal<OutputOf<WebExecutionHost['executor']['execute']>, RuntimeCommit>
>;


/** Compile-time law: prepared work is pinned, disposable, and never self-committing. */
export type PreparationIsPinnedAndDisposable = Assert<
  Equal<
    [OutputOf<WebPreparationAuthority['prepare']>, InputOf<WebPreparationAuthority['discard']>],
    [PreparedWork, PreparedWork]
  >
>;


/** Compile-time law: the handoff carries the full runtime commit, never a loose plan. */
export type AHandoffCarriesTheRuntimeCommit = Assert<
  Equal<CommittedOutputHandoff['commit'], RuntimeCommit>
>;


/**
 * Compile-time law: scheduling schedules the pre-execution request — it never
 * consumes or produces an already-created commit, and never fabricates an
 * applied address. Execution produces the commit; application produces the
 * physical address.
 */
export type SchedulingSchedulesBeforeExecution = Assert<
  Equal<
    [InputOf<SchedulingFacility['schedule']>, OutputOf<SchedulingFacility['schedule']>],
    [ExecutionRequest, ExecutionRequest]
  >
>;


/** Compile-time law: prepared work reaches visibility only through the real commit. */
export type PreparationReachesTheRealCommit = Assert<
  Equal<
    [InputOf<WebPreparationAuthority['consume']>, OutputOf<WebPreparationAuthority['consume']>],
    [PreparationConsumption, PreparationDisposition]
  >
>;


/** Compile-time law: execution requires scheduling and the projection authority. */
export type ExecutionRequiresSchedulingAndProjection = Assert<
  Equal<
    [ExecutionHostOffer['requires'], ExecutionHostOffer['id']],
    [
      readonly [SchedulingFacilityRequirement, CommitApplicationRequirement],
      RealizationOfferId<'liteship.web.offer.execution-host'>,
    ]
  >
>;

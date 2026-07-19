/**
 * Worker spine conformance — the `@liteship/_spine/worker.d.ts` mirror IS the
 * `@liteship/worker` runtime contract.
 *
 * `packages/_spine/worker.d.ts` is a hand-authored type mirror that
 * published packages treat as the canonical worker type contract (ADR-0010).
 * The worker runtime does NOT re-anchor from the spine — the spine is a pure
 * mirror, never imported back — so nothing keeps the two honest except this
 * suite. It silently drifted once (the worker split into compositor-types /
 * compositor-protocol / messages / spsc-ring) because there was no guard; this
 * file is that guard.
 *
 * The proof is bidirectional structural assignability (spine → runtime AND
 * runtime → spine) for every load-bearing worker type. A bidirectional
 * assignment of two named shapes proves they are structurally identical, so a
 * field added to the runtime but not mirrored — or a signature/arity change
 * like `onMetrics` — fails one direction and breaks the build.
 *
 * Compile-time assertions below are enforced via tsconfig.tests.json (this
 * file is in its `include`), so a future divergence fails `pnpm run typecheck`.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';

// Spine mirror (the contract under guard).
import type {
  ToWorkerMessage as SpineToWorker,
  FromWorkerMessage as SpineFromWorker,
  WorkerConfig as SpineWorkerConfig,
  WorkerUpdate as SpineWorkerUpdate,
  WorkerMetrics as SpineWorkerMetrics,
  SPSCRingBufferShape as SpineRingShape,
  SPSCRingPair as SpineRingPair,
  CompositorWorkerShape as SpineCompositorShape,
  QuantizerBoundarySource as SpineBoundarySource,
  CompositorWorkerStartupTelemetry as SpineStartupTelemetry,
} from '@liteship/_spine';

// Runtime truth — imported from the producing modules DIRECTLY (not the
// package index) so the guarded surface is exactly the runtime types.
import type {
  ToWorkerMessage as RtToWorker,
  FromWorkerMessage as RtFromWorker,
  WorkerConfig as RtWorkerConfig,
  WorkerUpdate as RtWorkerUpdate,
} from '../../../packages/worker/src/messages.js';
import type {
  WorkerMetrics as RtWorkerMetrics,
  CompositorWorkerShape as RtCompositorShape,
  QuantizerBoundarySource as RtBoundarySource,
  CompositorWorkerStartupTelemetry as RtStartupTelemetry,
} from '../../../packages/worker/src/compositor-types.js';
import type {
  SPSCRingBufferShape as RtRingShape,
  SPSCRingPair as RtRingPair,
} from '../../../packages/worker/src/spsc-ring.js';

// Public re-export surface — the worker exposes these names from its index;
// drift in the index re-export set also breaks the contract.
import { Messages, SPSCRing, CompositorWorker } from '@liteship/worker';

// ─────────────────────────────────────────────────────────────────────────────
// Type-level bidirectional assignability (spine ⇔ runtime). If a member, field,
// or signature diverges, one direction fails to typecheck and `pnpm run
// typecheck` (tsconfig.tests.json) goes red.
// ─────────────────────────────────────────────────────────────────────────────

// All bidirectional assignments live inside `__workerSpineTypeContract`, a
// function that is NEVER called — so its body is fully typechecked (the
// compile-time guard via tsconfig.tests.json) while nothing executes at
// runtime. Each `const x: T = value` is a one-way assignability proof; a
// matched pair proves structural equality. A divergence fails one direction
// and `pnpm run typecheck` goes red.

// § Message unions — both directions prove every member is mirrored, including
//   the resolved-state family (`bootstrap-resolved-state`, `apply-resolved-state`,
//   `resolved-state-ack`) that had silently drifted out of the spine.
//
//   SCOPING: three message members re-use @liteship/core types as their payload —
//   `start-render` carries a `VideoConfig`, `state` carries a `CompositeState`,
//   `frame` carries a `VideoFrameOutput` (which embeds a `CompositeState`).
//   Those payloads are owned by the @liteship/core SPINE (core.d.ts), NOT the
//   worker spine — the worker mirror merely imports them. A bidirectional union
//   assertion would drag any core-spine-vs-core-runtime drift (which is real
//   and pre-existing — `VideoConfig.durationMs` branding, the `wgsl` output —
//   but is core-spine territory, guarded elsewhere) into THIS worker guard. So
//   we exclude those three discriminants from the structural-equality assertion
//   and pin each at its worker-owned envelope (discriminant + worker-added
//   fields + that the payload field exists) below.
type CorePayloadDiscriminant = 'start-render' | 'state' | 'frame';
type WorkerOwned<T> = T extends { readonly type: CorePayloadDiscriminant } ? never : T;
type StartRenderOf<U> = Extract<U, { readonly type: 'start-render' }>;
type StateMsgOf<U> = Extract<U, { readonly type: 'state' }>;
type FrameOf<U> = Extract<U, { readonly type: 'frame' }>;

// § CompositorWorkerShape — the host-facing control surface. Two fields are
//   intentionally NOT bidirectionally equal and are excluded from the structural
//   assertion:
//     - `runtime`: the spine declares `unknown` (RuntimeCoordinator is out of
//       worker-spine scope) — a deliberate loosening, not drift.
//     - `onState`: its `CompositorWorkerState` payload extends the @liteship/core
//       `CompositeState` whose core-spine mirror is independently guarded.
//   Every other method — including the previously-drifted `onMetrics` (now a
//   single `WorkerMetrics` record, not `(fps, budgetUsed)`), the new
//   `bootstrapResolvedState` / `applyResolvedState` / `onResolvedStateAck`
//   methods, and the `addQuantizer` overloads — is pinned bidirectionally: the
//   runtime shape must satisfy the spine subset AND vice versa, so an arity or
//   signature change on either end fails the typecheck.
type WorkerOwnedShape<S> = Omit<S, 'runtime' | 'onState'>;

function __workerSpineTypeContract(
  aToWorker: WorkerOwned<SpineToWorker>,
  bToWorker: WorkerOwned<RtToWorker>,
  aFromWorker: WorkerOwned<SpineFromWorker>,
  bFromWorker: WorkerOwned<RtFromWorker>,
  aStartRender: StartRenderOf<SpineToWorker>,
  bStartRender: StartRenderOf<RtToWorker>,
  aStateMsg: StateMsgOf<SpineFromWorker>,
  bStateMsg: StateMsgOf<RtFromWorker>,
  aFrame: FrameOf<SpineFromWorker>,
  bFrame: FrameOf<RtFromWorker>,
  aCfg: SpineWorkerConfig,
  bCfg: RtWorkerConfig,
  aUpd: SpineWorkerUpdate,
  bUpd: RtWorkerUpdate,
  aMetrics: SpineWorkerMetrics,
  bMetrics: RtWorkerMetrics,
  aRing: SpineRingShape,
  bRing: RtRingShape,
  aPair: SpineRingPair,
  bPair: RtRingPair,
  aBoundary: SpineBoundarySource,
  bBoundary: RtBoundarySource,
  aTel: SpineStartupTelemetry,
  bTel: RtStartupTelemetry,
  rtShape: WorkerOwnedShape<RtCompositorShape>,
  spShape: WorkerOwnedShape<SpineCompositorShape>,
): void {
  // Message unions (worker-owned members).
  const _toWorkerS2R: WorkerOwned<RtToWorker> = aToWorker;
  const _toWorkerR2S: WorkerOwned<SpineToWorker> = bToWorker;
  const _fromWorkerS2R: WorkerOwned<RtFromWorker> = aFromWorker;
  const _fromWorkerR2S: WorkerOwned<SpineFromWorker> = bFromWorker;

  // Core-payload members, pinned at the worker-owned envelope only (discriminant
  // + named payload field; `state` also carries the worker-added optional
  // `resolvedStateGenerations`). The payload's field-level shape is NOT asserted
  // here — that is core-spine territory.
  const _startRenderHasConfig: { readonly type: 'start-render'; readonly config: unknown } = aStartRender;
  const _startRenderRtHasConfig: { readonly type: 'start-render'; readonly config: unknown } = bStartRender;
  const _stateGen: Record<string, number> | undefined = aStateMsg.resolvedStateGenerations;
  const _stateGenRt: Record<string, number> | undefined = bStateMsg.resolvedStateGenerations;
  const _frameHasOutput: { readonly type: 'frame'; readonly output: unknown } = aFrame;
  const _frameRtHasOutput: { readonly type: 'frame'; readonly output: unknown } = bFrame;

  // WorkerConfig / WorkerUpdate.
  const _cfgS2R: RtWorkerConfig = aCfg;
  const _cfgR2S: SpineWorkerConfig = bCfg;
  const _updS2R: RtWorkerUpdate = aUpd;
  const _updR2S: SpineWorkerUpdate = bUpd;

  // WorkerMetrics — the record the onMetrics callback receives (was positional).
  const _metricsS2R: RtWorkerMetrics = aMetrics;
  const _metricsR2S: SpineWorkerMetrics = bMetrics;

  // SPSC ring — buffer handle (capacity/count had drifted out) + named pair.
  const _ringS2R: RtRingShape = aRing;
  const _ringR2S: SpineRingShape = bRing;
  const _pairS2R: RtRingPair = aPair;
  const _pairR2S: SpineRingPair = bPair;

  // QuantizerBoundarySource.
  const _boundaryS2R: RtBoundarySource = aBoundary;
  const _boundaryR2S: SpineBoundarySource = bBoundary;

  // Startup telemetry sink (gained an optional onResolvedStateSettled).
  const _telS2R: RtStartupTelemetry = aTel;
  const _telR2S: SpineStartupTelemetry = bTel;

  // Compositor control surface (worker-owned methods).
  const _shapeR2S: WorkerOwnedShape<SpineCompositorShape> = rtShape;
  const _shapeS2R: WorkerOwnedShape<RtCompositorShape> = spShape;

  void _toWorkerS2R;
  void _toWorkerR2S;
  void _fromWorkerS2R;
  void _fromWorkerR2S;
  void _startRenderHasConfig;
  void _startRenderRtHasConfig;
  void _stateGen;
  void _stateGenRt;
  void _frameHasOutput;
  void _frameRtHasOutput;
  void _cfgS2R;
  void _cfgR2S;
  void _updS2R;
  void _updR2S;
  void _metricsS2R;
  void _metricsR2S;
  void _ringS2R;
  void _ringR2S;
  void _pairS2R;
  void _pairR2S;
  void _boundaryS2R;
  void _boundaryR2S;
  void _telS2R;
  void _telR2S;
  void _shapeR2S;
  void _shapeS2R;
}
void __workerSpineTypeContract;

describe('worker spine conformance — @liteship/_spine/worker.d.ts mirrors @liteship/worker', () => {
  it('exposes the message-protocol guards (runtime surface backing the compile-time mirror)', () => {
    expect(typeof Messages.isToWorker).toBe('function');
    expect(typeof Messages.isFromWorker).toBe('function');
  });

  it('exposes the SPSC + compositor factories (runtime surface backing the compile-time mirror)', () => {
    expect(typeof SPSCRing.createPair).toBe('function');
    expect(typeof CompositorWorker.create).toBe('function');
  });

  it('SPSCRing.createPair returns the named pair shape at runtime', () => {
    const pair = SPSCRing.createPair(4, 2);
    expect(pair.buffer).toBeInstanceOf(SharedArrayBuffer);
    expect(typeof pair.producer.push).toBe('function');
    expect(typeof pair.consumer.pop).toBe('function');
    expect(pair.producer.capacity).toBe(4);
    expect(pair.consumer.count).toBe(0);
  });

  it('Messages exposes the resolved-state envelope members in both unions', () => {
    // Runtime existence: the three resolved-state message types are real on the
    // wire (guards accept them), matching the spine union members just pinned.
    expect(Messages.isToWorker({ type: 'bootstrap-resolved-state', states: [] })).toBe(true);
    expect(Messages.isToWorker({ type: 'apply-resolved-state', states: [] })).toBe(true);
    expect(
      Messages.isFromWorker({
        type: 'resolved-state-ack',
        generation: 0,
        states: [],
        additionalOutputsChanged: false,
      }),
    ).toBe(true);
  });
});

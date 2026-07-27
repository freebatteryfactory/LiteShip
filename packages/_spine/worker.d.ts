/**
 * @liteship/worker type spine -- off-main-thread compositor and render workers.
 */

import type {
  CompositeState,
  VideoConfig,
  VideoFrameOutput,
  ContentAddress,
  StateName,
  RuntimeWritePlan,
  ProgramUniforms,
  RuntimeCoordinator,
  AsyncOwnedResource,
  Millis,
} from './core.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

/** Capacity and optional transport settings used to initialize a worker runtime. */
export interface WorkerConfig {
  /** @defaultValue 64 */
  readonly poolCapacity?: number;
  readonly targetFps?: number;
}

/** Host-to-worker initialization command. */
interface InitMessage {
  readonly type: 'init';
  readonly config?: WorkerConfig;
}

/** Host command registering one quantizer with the worker. */
interface AddQuantizerMessage {
  readonly type: 'add-quantizer';
  readonly name: string;
  readonly boundaryId: ContentAddress;
  readonly states: readonly StateName[];
  readonly thresholds: Float64Array | readonly number[];
}

/** Quantizer definition and initial evidence transferred during bootstrap. */
interface BootstrapQuantizerRegistration {
  readonly name: string;
  readonly boundaryId: ContentAddress;
  readonly states: readonly StateName[];
  readonly thresholds: Float64Array | readonly number[];
  readonly initialState?: StateName;
  readonly blendWeights?: Record<string, number>;
}

/**
 * A single resolved discrete-state entry in a bootstrap/apply message.
 * `generation` increases monotonically so receivers can discard stale
 * out-of-order deliveries.
 */
interface ResolvedStateEntry {
  readonly name: string;
  readonly state: StateName;
  readonly generation: number;
}

/** First compute payload bundled with worker bootstrap. */
interface StartupComputePacket {
  readonly bootstrapMode: 'cold' | 'warm-snapshot' | 'rebuild';
  readonly registrations: readonly BootstrapQuantizerRegistration[];
  readonly updates: readonly WorkerUpdate[];
}

/** Batched quantizer registrations sent before live computation starts. */
interface BootstrapQuantizersMessage {
  readonly type: 'bootstrap-quantizers';
  readonly registrations: readonly BootstrapQuantizerRegistration[];
}

/** Worker command executing the initial compute packet. */
interface StartupComputeMessage {
  readonly type: 'startup-compute';
  readonly packet: StartupComputePacket;
}

/** Authoritative state snapshot installed during worker bootstrap. */
interface BootstrapResolvedStateMessage {
  readonly type: 'bootstrap-resolved-state';
  readonly states: readonly ResolvedStateEntry[];
  readonly ack?: boolean;
}

/** Host command applying a newer authoritative state snapshot. */
interface ApplyResolvedStateMessage {
  readonly type: 'apply-resolved-state';
  readonly states: readonly ResolvedStateEntry[];
  readonly ack?: boolean;
}

/** Host command removing a registered quantizer. */
interface RemoveQuantizerMessage {
  readonly type: 'remove-quantizer';
  readonly name: string;
}

/** Host command evaluating one registered quantizer input. */
interface EvaluateMessage {
  readonly type: 'evaluate';
  readonly name: string;
  readonly value: number;
}

/** Host command updating the blend weight of one compositor state. */
interface SetBlendMessage {
  readonly type: 'set-blend';
  readonly name: string;
  readonly weights: Record<string, number>;
}

/** Batch update that removes one quantizer. */
interface RemoveQuantizerUpdate {
  readonly type: 'remove-quantizer';
  readonly name: string;
}

/** Batch update that evaluates one quantizer. */
interface EvaluateUpdate {
  readonly type: 'evaluate';
  readonly name: string;
  readonly value: number;
}

/** Batch update that changes one compositor blend weight. */
interface SetBlendUpdate {
  readonly type: 'set-blend';
  readonly name: string;
  readonly weights: Record<string, number>;
}

/** Closed mutation language accepted by a batched worker update. */
export type WorkerUpdate = RemoveQuantizerUpdate | EvaluateUpdate | SetBlendUpdate;

/** Host command applying an ordered batch of worker updates. */
interface ApplyUpdatesMessage {
  readonly type: 'apply-updates';
  readonly updates: readonly WorkerUpdate[];
}

/** Host command requesting one worker computation step. */
interface ComputeMessage {
  readonly type: 'compute';
}

/** Host command resetting mutable worker state while retaining allocations. */
interface WarmResetMessage {
  readonly type: 'warm-reset';
}

/** Host command starting the worker's render loop. */
interface StartRenderMessage {
  readonly type: 'start-render';
  readonly config: VideoConfig;
}

/** Host command stopping the worker's render loop. */
interface StopRenderMessage {
  readonly type: 'stop-render';
}

/** Host command transferring an offscreen canvas into the worker. */
interface TransferCanvasMessage {
  readonly type: 'transfer-canvas';
  readonly canvas: OffscreenCanvas;
}

/** Host command releasing the worker and its owned resources. */
interface DisposeMessage {
  readonly type: 'dispose';
}

/** Closed protocol union sent from the host to a LiteShip worker. */
export type ToWorkerMessage =
  | InitMessage
  | AddQuantizerMessage
  | BootstrapQuantizersMessage
  | StartupComputeMessage
  | BootstrapResolvedStateMessage
  | ApplyResolvedStateMessage
  | ApplyUpdatesMessage
  | RemoveQuantizerMessage
  | EvaluateMessage
  | SetBlendMessage
  | WarmResetMessage
  | ComputeMessage
  | StartRenderMessage
  | StopRenderMessage
  | TransferCanvasMessage
  | DisposeMessage;

/** Worker acknowledgement that initialization completed. */
interface ReadyMessage {
  readonly type: 'ready';
}

/** Worker publication of a computed state transition. */
interface StateMessage {
  readonly type: 'state';
  readonly state: CompositeState;
  readonly resolvedStateGenerations?: Record<string, number>;
}

/** Worker acknowledgement of an applied authoritative state snapshot. */
interface ResolvedStateAckMessage {
  readonly type: 'resolved-state-ack';
  readonly generation: number;
  readonly states: readonly {
    readonly name: string;
    readonly state: StateName;
  }[];
  readonly additionalOutputsChanged: boolean;
}

/** Worker publication of one rendered frame. */
interface FrameMessage {
  readonly type: 'frame';
  readonly output: VideoFrameOutput;
}

/** Worker publication that a requested render completed. */
interface RenderCompleteMessage {
  readonly type: 'render-complete';
  readonly totalFrames: number;
}

/** Failure site codes the built-in workers emit. */
type WorkerErrorCode = 'render-failed' | 'startup-compute-failed' | 'compute-failed';

/** Bounded worker failure sent to the host. */
interface ErrorMessage {
  readonly type: 'error';
  /** Which failure site produced the error; optional so custom protocol implementations keep compiling. */
  readonly code?: WorkerErrorCode;
  readonly message: string;
  /** Content address of the entity being processed when the failure occurred, when known. */
  readonly subjectId?: ContentAddress;
  /** Literal next step the main-thread consumer can render. */
  readonly hint?: string;
  /** Inbound message `type` the worker was handling when it threw (e.g. 'compute'). */
  readonly context?: string;
}

/** Worker performance and queue telemetry sent to the host. */
interface MetricsMessage {
  readonly type: 'metrics';
  readonly fps: number;
  readonly budgetUsed: number;
}

/**
 * The performance sample delivered to `CompositorWorker.onMetrics`
 * listeners — a single record reusing the wire {@link MetricsMessage} shape
 * (not positional `(fps, budgetUsed)` arguments), so a future metric can be
 * added without changing the callback's arity (F1).
 */
export type WorkerMetrics = MetricsMessage;

/** Closed protocol union sent from a LiteShip worker to its host. */
export type FromWorkerMessage =
  | ReadyMessage
  | StateMessage
  | ResolvedStateAckMessage
  | FrameMessage
  | RenderCompleteMessage
  | ErrorMessage
  | MetricsMessage;

export declare const Messages: {
  isToWorker(msg: unknown): msg is ToWorkerMessage;
  isFromWorker(msg: unknown): msg is FromWorkerMessage;
};

/** Constructors and guards for the worker message protocol. */
export declare namespace Messages {
  export type ToWorker = ToWorkerMessage;
  export type FromWorker = FromWorkerMessage;
  export type Config = WorkerConfig;
  export type Update = WorkerUpdate;
  export type BootstrapRegistration = BootstrapQuantizerRegistration;
  export type StartupPacket = StartupComputePacket;
  export type ResolvedState = ResolvedStateEntry;
}

/** Structural worker boundary used by browser hosts and deterministic test doubles. */
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. SPSC RING BUFFER
// ═══════════════════════════════════════════════════════════════════════════════

/** Single-producer/single-consumer shared-memory ring buffer. */
export interface SPSCRing {
  push(data: Float64Array): boolean;
  pop(out: Float64Array): boolean;
  /** Number of slots in the ring buffer. */
  readonly capacity: number;
  /** Current number of occupied slots. */
  readonly count: number;
}

/**
 * A matched producer/consumer pair sharing one `SharedArrayBuffer`,
 * returned by {@link SPSCRing.createPair}. Named (rather than an inline
 * anonymous object) so the pair shape is a single referenceable type.
 */
export interface SPSCRingPair {
  /** The shared buffer carrying the control header + data slots. Transfer this to the Worker. */
  readonly buffer: SharedArrayBuffer;
  /** Producer-side handle (push-only). */
  readonly producer: SPSCRing;
  /** Consumer-side handle (pop-only). */
  readonly consumer: SPSCRing;
}

export declare const SPSCRing: {
  createPair(slotCount: number, slotSize: number): SPSCRingPair;
  /** Ring geometry rides in the buffer header; explicit slotCount/slotSize are validated against it (a mismatch throws). */
  attachProducer(sab: SharedArrayBuffer, slotCount?: number, slotSize?: number): SPSCRing;
  /** Ring geometry rides in the buffer header; explicit slotCount/slotSize are validated against it (a mismatch throws). */
  attachConsumer(sab: SharedArrayBuffer, slotCount?: number, slotSize?: number): SPSCRing;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. COMPOSITOR WORKER
// ═══════════════════════════════════════════════════════════════════════════════

/** Named stages measured while starting or resetting a compositor worker. */
export type CompositorWorkerStartupStage = 'claim-or-create' | 'coordinator-reset-or-create' | 'listener-bind';

/** Per-stage timing and path evidence from compositor-worker startup. */
export interface CompositorWorkerStartupTelemetry {
  recordStage(stage: CompositorWorkerStartupStage, durationNs: number): void;
  /** Fired when the worker acknowledges the resolved-state bootstrap. */
  onResolvedStateSettled?(states: readonly ResolvedStateEntry[]): void;
}

/**
 * A `CompositeState` snapshot emitted by the compositor worker, optionally
 * annotated with per-quantizer generation counters so receivers can drop
 * stale out-of-order messages.
 */
export type CompositorWorkerState = CompositeState & {
  readonly resolvedStateGenerations?: Record<string, number>;
};

/**
 * Acknowledgement payload emitted by the worker after it applies a
 * resolved-state update from the main thread.
 */
export interface ResolvedStateAckPayload {
  /** Generation counter the worker acknowledges. */
  readonly generation: number;
  /** The state transitions the worker actually observed. */
  readonly states: readonly {
    readonly name: string;
    readonly state: StateName;
  }[];
  /** Whether non-discrete outputs (blend, CSS, etc.) changed in this round. */
  readonly additionalOutputsChanged: boolean;
}

/**
 * The boundary surface addQuantizer derives a registration from —
 * structurally satisfied by a `defineBoundary` result from @liteship/core.
 */
export interface QuantizerBoundarySource {
  readonly id: ContentAddress;
  /** Signal input name — used as the quantizer name when none is given. */
  readonly input: string;
  /** Plain strings — BoundaryDef.states is unbranded. */
  readonly states: readonly string[];
  readonly thresholds: readonly number[];
}

/** Live worker handle that owns quantization and compositor state. */
export interface CompositorWorker extends AsyncOwnedResource {
  readonly worker: Worker;
  /** Shared runtime coordination surface reflecting host-side worker state. */
  readonly runtime: RuntimeCoordinator;
  /** Register a quantizer from a defineBoundary result; name defaults to boundary.input. */
  addQuantizer(boundary: QuantizerBoundarySource): void;
  addQuantizer(
    name: string,
    boundary: {
      readonly id: ContentAddress;
      /** Plain strings — branded to StateName internally; both overloads share the unbranded surface (F2). */
      readonly states: readonly string[];
      readonly thresholds: readonly number[];
    },
  ): void;
  removeQuantizer(name: string): void;
  evaluate(name: string, value: number): void;
  setBlendWeights(name: string, weights: Record<string, number>): void;
  /** Seed resolved quantizer state into the worker without raw threshold evaluation. */
  bootstrapResolvedState(states: readonly ResolvedStateEntry[]): void;
  /** Mirror resolved quantizer state updates into the worker without raw threshold evaluation. */
  applyResolvedState(states: readonly ResolvedStateEntry[]): void;
  requestCompute(): void;
  onState(callback: (state: CompositorWorkerState) => void): () => void;
  /** Subscribe to resolved-state acknowledgement updates. Returns an unsubscribe function. */
  onResolvedStateAck(callback: (ack: ResolvedStateAckPayload) => void): () => void;
  /**
   * Subscribe to metrics updates. The callback receives a single
   * {@link WorkerMetrics} record (not positional `fps`/`budgetUsed`
   * arguments), so a future metric can be added without breaking
   * existing callbacks (F1).
   */
  onMetrics(callback: (metrics: WorkerMetrics) => void): () => void;
}

export declare const CompositorWorker: {
  create(config?: WorkerConfig, startupTelemetry?: CompositorWorkerStartupTelemetry): CompositorWorker;
};

export declare namespace CompositorWorker {
  export type StartupStage = CompositorWorkerStartupStage;
  export type StartupTelemetry = CompositorWorkerStartupTelemetry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. RENDER WORKER
// ═══════════════════════════════════════════════════════════════════════════════

/** Live rendering worker that owns canvas transfer and frame production. */
export interface RenderWorker extends AsyncOwnedResource {
  readonly worker: Worker;
  transferCanvas(canvas: OffscreenCanvas): void;
  startRender(config: VideoConfig): void;
  stopRender(): void;
  onFrame(callback: (output: VideoFrameOutput) => void): () => void;
  onComplete(callback: (totalFrames: number) => void): () => void;
}

export declare const RenderWorker: {
  create(config?: WorkerConfig): RenderWorker;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. WORKER HOST
// ═══════════════════════════════════════════════════════════════════════════════

/** The canvas surface attachCanvas needs — HTMLCanvasElement satisfies it structurally. */
export interface TransferableCanvas {
  readonly width: number;
  readonly height: number;
  transferControlToOffscreen(): OffscreenCanvas;
}

/** Render configuration for WorkerHost.startRender — only durationMs is required. */
export interface WorkerHostRenderConfig {
  readonly durationMs: number | Millis;
  /** @defaultValue 60 */
  readonly fps?: number;
  /** @defaultValue the attached canvas's width at attachCanvas() time */
  readonly width?: number;
  /** @defaultValue the attached canvas's height at attachCanvas() time */
  readonly height?: number;
}

/** Host coordinator that owns worker transport, state, and teardown. */
export interface WorkerHost extends AsyncOwnedResource {
  readonly compositor: CompositorWorker;
  readonly renderer: RenderWorker | null;
  attachCanvas(canvas: TransferableCanvas): void;
  startRender(config: WorkerHostRenderConfig): void;
  stopRender(): void;
  onState(
    callback: (state: CompositeState & { readonly resolvedStateGenerations?: Record<string, number> }) => void,
  ): () => void;
}

export declare const WorkerHost: {
  create(config?: WorkerConfig, startupTelemetry?: CompositorWorkerStartupTelemetry): WorkerHost;
};

export declare namespace WorkerHost {
  export type StartupTelemetry = CompositorWorkerStartupTelemetry;
}

// ═════════════════════════════════════════════════════════════════════════════════
// § 6. OFF-THREAD MOTION SAMPLER
// ════════════════════════════════════════════════════════════════════════════════

/** Transferable motion sample delivered to a worker-side timeline. */
export interface MotionSampleMessage {
  readonly type: 'motion-sample';
  readonly t: number;
  readonly css: Record<string, string>;
  readonly wgsl: Record<string, number>;
}

export declare function sampleProgramUniforms(plan: RuntimeWritePlan, t: number): ProgramUniforms;
export declare function motionSampleMessage(plan: RuntimeWritePlan, t: number): MotionSampleMessage;

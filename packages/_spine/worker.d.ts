/**
 * @liteship/worker type spine -- off-main-thread compositor and render workers.
 */

import type { CompositeState, VideoConfig, VideoFrameOutput, ContentAddress, StateName } from './core.d.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkerConfig {
  /** @defaultValue 64 */
  readonly poolCapacity?: number;
  readonly targetFps?: number;
}

interface InitMessage {
  readonly type: 'init';
  readonly config?: WorkerConfig;
}

interface AddQuantizerMessage {
  readonly type: 'add-quantizer';
  readonly name: string;
  readonly boundaryId: ContentAddress;
  readonly states: readonly StateName[];
  readonly thresholds: Float64Array | readonly number[];
}

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

interface StartupComputePacket {
  readonly bootstrapMode: 'cold' | 'warm-snapshot' | 'rebuild';
  readonly registrations: readonly BootstrapQuantizerRegistration[];
  readonly updates: readonly WorkerUpdate[];
}

interface BootstrapQuantizersMessage {
  readonly type: 'bootstrap-quantizers';
  readonly registrations: readonly BootstrapQuantizerRegistration[];
}

interface StartupComputeMessage {
  readonly type: 'startup-compute';
  readonly packet: StartupComputePacket;
}

interface BootstrapResolvedStateMessage {
  readonly type: 'bootstrap-resolved-state';
  readonly states: readonly ResolvedStateEntry[];
  readonly ack?: boolean;
}

interface ApplyResolvedStateMessage {
  readonly type: 'apply-resolved-state';
  readonly states: readonly ResolvedStateEntry[];
  readonly ack?: boolean;
}

interface RemoveQuantizerMessage {
  readonly type: 'remove-quantizer';
  readonly name: string;
}

interface EvaluateMessage {
  readonly type: 'evaluate';
  readonly name: string;
  readonly value: number;
}

interface SetBlendMessage {
  readonly type: 'set-blend';
  readonly name: string;
  readonly weights: Record<string, number>;
}

interface RemoveQuantizerUpdate {
  readonly type: 'remove-quantizer';
  readonly name: string;
}

interface EvaluateUpdate {
  readonly type: 'evaluate';
  readonly name: string;
  readonly value: number;
}

interface SetBlendUpdate {
  readonly type: 'set-blend';
  readonly name: string;
  readonly weights: Record<string, number>;
}

export type WorkerUpdate = RemoveQuantizerUpdate | EvaluateUpdate | SetBlendUpdate;

interface ApplyUpdatesMessage {
  readonly type: 'apply-updates';
  readonly updates: readonly WorkerUpdate[];
}

interface ComputeMessage {
  readonly type: 'compute';
}

interface WarmResetMessage {
  readonly type: 'warm-reset';
}

interface StartRenderMessage {
  readonly type: 'start-render';
  readonly config: VideoConfig;
}

interface StopRenderMessage {
  readonly type: 'stop-render';
}

interface TransferCanvasMessage {
  readonly type: 'transfer-canvas';
  readonly canvas: OffscreenCanvas;
}

interface DisposeMessage {
  readonly type: 'dispose';
}

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

interface ReadyMessage {
  readonly type: 'ready';
}

interface StateMessage {
  readonly type: 'state';
  readonly state: CompositeState;
  readonly resolvedStateGenerations?: Record<string, number>;
}

interface ResolvedStateAckMessage {
  readonly type: 'resolved-state-ack';
  readonly generation: number;
  readonly states: readonly {
    readonly name: string;
    readonly state: StateName;
  }[];
  readonly additionalOutputsChanged: boolean;
}

interface FrameMessage {
  readonly type: 'frame';
  readonly output: VideoFrameOutput;
}

interface RenderCompleteMessage {
  readonly type: 'render-complete';
  readonly totalFrames: number;
}

/** Failure site codes the built-in workers emit. */
type WorkerErrorCode = 'render-failed' | 'startup-compute-failed' | 'compute-failed';

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

interface MetricsMessage {
  readonly type: 'metrics';
  readonly fps: number;
  readonly budgetUsed: number;
}

/**
 * The performance sample delivered to {@link CompositorWorkerShape.onMetrics}
 * listeners — a single record reusing the wire {@link MetricsMessage} shape
 * (not positional `(fps, budgetUsed)` arguments), so a future metric can be
 * added without changing the callback's arity (F1).
 */
export type WorkerMetrics = MetricsMessage;

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

export declare namespace Messages {
  export type ToWorker = ToWorkerMessage;
  export type FromWorker = FromWorkerMessage;
  export type Config = WorkerConfig;
  export type Update = WorkerUpdate;
  export type BootstrapRegistration = BootstrapQuantizerRegistration;
  export type StartupPacket = StartupComputePacket;
  export type ResolvedState = ResolvedStateEntry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. SPSC RING BUFFER
// ═══════════════════════════════════════════════════════════════════════════════

export interface SPSCRingBufferShape {
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
  readonly producer: SPSCRingBufferShape;
  /** Consumer-side handle (pop-only). */
  readonly consumer: SPSCRingBufferShape;
}

export declare const SPSCRing: {
  createPair(slotCount: number, slotSize: number): SPSCRingPair;
  /** Ring geometry rides in the buffer header; explicit slotCount/slotSize are validated against it (a mismatch throws). */
  attachProducer(sab: SharedArrayBuffer, slotCount?: number, slotSize?: number): SPSCRingBufferShape;
  /** Ring geometry rides in the buffer header; explicit slotCount/slotSize are validated against it (a mismatch throws). */
  attachConsumer(sab: SharedArrayBuffer, slotCount?: number, slotSize?: number): SPSCRingBufferShape;
};

export declare namespace SPSCRing {
  export type Shape = SPSCRingBufferShape;
  export type Pair = SPSCRingPair;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. COMPOSITOR WORKER
// ═══════════════════════════════════════════════════════════════════════════════

export type CompositorWorkerStartupStage =
  | 'claim-or-create'
  | 'coordinator-reset-or-create'
  | 'listener-bind';

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
 * structurally satisfied by a `Boundary.make` result from @liteship/core.
 */
export interface QuantizerBoundarySource {
  readonly id: ContentAddress;
  /** Signal input name — used as the quantizer name when none is given. */
  readonly input: string;
  /** Plain strings — BoundaryDef.states is unbranded. */
  readonly states: readonly string[];
  readonly thresholds: readonly number[];
}

export interface CompositorWorkerShape {
  readonly worker: Worker;
  /** Runtime coordination surface (internal shape, see @liteship/core RuntimeCoordinator). */
  readonly runtime: unknown;
  /** Register a quantizer from a Boundary.make result; name defaults to boundary.input. */
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
  dispose(): void;
}

export declare const CompositorWorker: {
  create(config?: WorkerConfig, startupTelemetry?: CompositorWorkerStartupTelemetry): CompositorWorkerShape;
};

export declare namespace CompositorWorker {
  export type Shape = CompositorWorkerShape;
  export type State = CompositorWorkerState;
  export type Metrics = WorkerMetrics;
  export type BoundarySource = QuantizerBoundarySource;
  export type ResolvedStateAck = ResolvedStateAckPayload;
  export type StartupStage = CompositorWorkerStartupStage;
  export type StartupTelemetry = CompositorWorkerStartupTelemetry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. RENDER WORKER
// ═══════════════════════════════════════════════════════════════════════════════

export interface RenderWorkerShape {
  readonly worker: Worker;
  transferCanvas(canvas: OffscreenCanvas): void;
  startRender(config: VideoConfig): void;
  stopRender(): void;
  onFrame(callback: (output: VideoFrameOutput) => void): () => void;
  onComplete(callback: (totalFrames: number) => void): () => void;
  dispose(): void;
}

export declare const RenderWorker: {
  create(config?: WorkerConfig): RenderWorkerShape;
};

export declare namespace RenderWorker {
  export type Shape = RenderWorkerShape;
}

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
  readonly durationMs: number;
  /** @defaultValue 60 */
  readonly fps?: number;
  /** @defaultValue the attached canvas's width at attachCanvas() time */
  readonly width?: number;
  /** @defaultValue the attached canvas's height at attachCanvas() time */
  readonly height?: number;
}

export interface WorkerHostShape {
  readonly compositor: CompositorWorkerShape;
  readonly renderer: RenderWorkerShape | null;
  attachCanvas(canvas: TransferableCanvas): void;
  startRender(config: WorkerHostRenderConfig): void;
  stopRender(): void;
  onState(callback: (state: CompositeState) => void): () => void;
  dispose(): void;
}

export declare const WorkerHost: {
  create(config?: WorkerConfig, startupTelemetry?: CompositorWorkerStartupTelemetry): WorkerHostShape;
};

export declare namespace WorkerHost {
  export type Shape = WorkerHostShape;
  export type StartupTelemetry = CompositorWorkerStartupTelemetry;
}

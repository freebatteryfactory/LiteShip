/**
 * Typed message protocol for main-thread and worker communication.
 *
 * All message types are discriminated unions keyed on `type`.
 * Every payload must be Structured Clone compatible -- no functions,
 * no Effect objects, only plain serializable data.
 *
 * @module
 */

import type { CompositeState, VideoConfig, VideoFrameOutput, ContentAddress, StateName } from '@czap/core';

// ---------------------------------------------------------------------------
// Worker configuration
// ---------------------------------------------------------------------------

/**
 * Tunable knobs that the main thread sends to a worker at construction time.
 *
 * Omitted fields fall back to worker-local defaults chosen by
 * {@link CompositorWorker} / {@link RenderWorker}.
 */
export interface WorkerConfig {
  /** Maximum number of pooled `CompositeState` slots the worker may hold. */
  readonly poolCapacity?: number;
  /**
   * Target frames-per-second for the render loop (affects frame pacing).
   *
   * Wall-clock production throttle: the render worker waits out the
   * remainder of each `1000 / targetFps` budget before drawing the next
   * frame, so frames are never *emitted* faster than this rate (useful
   * for live preview). This is a different axis from `VideoConfig.fps`,
   * which controls content timing -- frame count and per-frame
   * timestamps -- and is unaffected by pacing. Omitted: the loop
   * free-runs at maximum speed (offline-encode behavior).
   */
  readonly targetFps?: number;
}

// ---------------------------------------------------------------------------
// Main -> Worker messages
// ---------------------------------------------------------------------------

interface InitMessage {
  readonly type: 'init';
  /** Construction-time knobs; omitted fields fall back to worker-local defaults. */
  readonly config?: WorkerConfig;
}

interface AddQuantizerMessage {
  readonly type: 'add-quantizer';
  readonly name: string;
  readonly boundaryId: ContentAddress;
  readonly states: readonly StateName[];
  readonly thresholds: Float64Array | readonly number[];
}

/**
 * Bootstrap registration for a single quantizer inside a worker.
 *
 * Sent from the main thread so the worker can reconstruct its quantizer
 * registry without re-running the full build pipeline on cold start.
 */
export interface BootstrapQuantizerRegistration {
  /** Stable quantizer name (key in the registry). */
  readonly name: string;
  /** Boundary content-address this quantizer is anchored to. */
  readonly boundaryId: ContentAddress;
  /** Ordered discrete state labels. */
  readonly states: readonly StateName[];
  /**
   * Lower-bound thresholds, one per state: `thresholds[i]` is the lower
   * bound of `states[i]`, so `thresholds.length === states.length`
   * (canonical contract — see `packages/quantizer/src/evaluate.ts`).
   * A value below every threshold falls back to `states[0]`.
   */
  readonly thresholds: Float64Array | readonly number[];
  /** Optional initial discrete state (defaults to the first state). */
  readonly initialState?: StateName;
  /** Optional initial blend weights, keyed by state label. */
  readonly blendWeights?: Record<string, number>;
}

/**
 * Aggregate startup payload: registrations plus any pending updates that
 * should be replayed immediately after the worker finishes wiring its
 * quantizer registry.
 */
export interface StartupComputePacket {
  /** Whether the worker should boot empty, rehydrate from snapshot, or fully rebuild. */
  readonly bootstrapMode: 'cold' | 'warm-snapshot' | 'rebuild';
  /** Registrations to install. */
  readonly registrations: readonly BootstrapQuantizerRegistration[];
  /** Updates to replay after registration. */
  readonly updates: readonly WorkerUpdate[];
}

/**
 * A single resolved discrete-state entry in a bootstrap/apply message.
 *
 * `generation` monotonically increases so receivers can discard stale
 * out-of-order deliveries.
 */
export interface ResolvedStateEntry {
  /** Quantizer name. */
  readonly name: string;
  /** Resolved discrete state label. */
  readonly state: StateName;
  /** Monotonically-increasing generation counter. */
  readonly generation: number;
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

interface RemoveQuantizerUpdate {
  readonly type: 'remove-quantizer';
  readonly name: string;
}

interface EvaluateMessage {
  readonly type: 'evaluate';
  readonly name: string;
  readonly value: number;
}

interface EvaluateUpdate {
  readonly type: 'evaluate';
  readonly name: string;
  readonly value: number;
}

interface SetBlendMessage {
  readonly type: 'set-blend';
  readonly name: string;
  readonly weights: Record<string, number>;
}

interface SetBlendUpdate {
  readonly type: 'set-blend';
  readonly name: string;
  readonly weights: Record<string, number>;
}

/**
 * Incremental update applied to a worker's quantizer registry after
 * bootstrap. Replayed as part of {@link StartupComputePacket.updates} or
 * sent directly via an `apply-updates` message.
 */
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

/**
 * Transfer an OffscreenCanvas to the worker.
 * The canvas must be listed in the `transfer` array of postMessage.
 */
interface TransferCanvasMessage {
  readonly type: 'transfer-canvas';
  readonly canvas: OffscreenCanvas;
}

interface DisposeMessage {
  readonly type: 'dispose';
}

/**
 * Every message the main thread may send to a compositor/render worker.
 * Discriminated on the `type` field.
 */
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

// ---------------------------------------------------------------------------
// Worker -> Main messages
// ---------------------------------------------------------------------------

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
}

interface MetricsMessage {
  readonly type: 'metrics';
  readonly fps: number;
  readonly budgetUsed: number;
}

/**
 * Build a bootstrap/apply resolved-state envelope.
 *
 * Used by the main thread to ship a batch of resolved discrete states
 * either as part of bootstrap (`bootstrap-resolved-state`) or as an
 * incremental reconciliation (`apply-resolved-state`).
 *
 * @param type - Which envelope to produce.
 * @param states - The resolved entries to include.
 * @param ack - Whether the worker is expected to acknowledge the delivery.
 */
export function makeResolvedStateEnvelope(
  type: 'bootstrap-resolved-state' | 'apply-resolved-state',
  states: readonly ResolvedStateEntry[],
  ack: boolean,
): BootstrapResolvedStateMessage | ApplyResolvedStateMessage {
  return {
    type,
    states,
    ack,
  };
}

/**
 * Every message a worker may send back to the main thread. Discriminated
 * on the `type` field. Includes readiness, state updates, frame output,
 * metrics, completion signals, and errors.
 */
export type FromWorkerMessage =
  | ReadyMessage
  | StateMessage
  | ResolvedStateAckMessage
  | FrameMessage
  | RenderCompleteMessage
  | ErrorMessage
  | MetricsMessage;

// ---------------------------------------------------------------------------
// Namespace re-export
// ---------------------------------------------------------------------------

/**
 * Runtime type guards and type aliases for the worker message protocol.
 * Consumers typically use {@link Messages.isToWorker} /
 * {@link Messages.isFromWorker} inside a `message` handler to narrow
 * `event.data` before switching on the `type` field.
 *
 * @example
 * ```ts
 * worker.addEventListener('message', (e) => {
 *   if (!Messages.isFromWorker(e.data)) return;
 *   if (e.data.type === 'state') { /* ... *\/ }
 * });
 * ```
 */
export const Messages = {
  /** Type guard: is a ToWorkerMessage */
  isToWorker(msg: unknown): msg is ToWorkerMessage {
    return typeof msg === 'object' && msg !== null && 'type' in msg;
  },

  /** Type guard: is a FromWorkerMessage */
  isFromWorker(msg: unknown): msg is FromWorkerMessage {
    return typeof msg === 'object' && msg !== null && 'type' in msg;
  },
} as const;

export declare namespace Messages {
  /** Every message the main thread may send to a worker. */
  export type ToWorker = ToWorkerMessage;
  /** Every message a worker may send back to the main thread. */
  export type FromWorker = FromWorkerMessage;
  /** Tunable worker construction knobs. */
  export type Config = WorkerConfig;
  /** Incremental update applied post-bootstrap. */
  export type Update = WorkerUpdate;
  /** Single quantizer bootstrap registration. */
  export type BootstrapRegistration = BootstrapQuantizerRegistration;
  /** Full startup packet flushed once during worker boot. */
  export type StartupPacket = StartupComputePacket;
  /** Single resolved-state entry delivered to a worker. */
  export type ResolvedState = ResolvedStateEntry;
}

/**
 * The DOM Worker surface czap's hosts actually drive (postMessage with
 * transfer, terminate, message listening). Named so the dependency is
 * structural rather than ambient: test doubles (tests/helpers/mock-worker.ts)
 * conform to THIS type, and drift between host usage and the double breaks
 * the build.
 */
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
}

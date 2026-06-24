/**
 * CompositorWorker -- off-main-thread compositor running in a Web Worker.
 *
 * The worker maintains a simplified compositor that:
 * - Tracks quantizer definitions (name maps to boundary plus current state)
 * - Evaluates threshold-based quantization
 * - Maintains blend weight overrides
 * - Produces CompositeState on `compute` commands
 * - Uses DirtyFlags for selective recomputation
 *
 * The worker script is inlined as a Blob URL to avoid bundler complexity
 * with separate worker entry files.
 *
 * This file is the **thin wiring layer**: it claims a lease, builds the
 * explicit {@link CompositorWorkerRuntimeState} record, binds the worker's
 * `message`/`error` events to the `reduce → effects` protocol machine, and
 * forwards each public method to its standalone command function. All
 * behaviour lives in the four sibling modules:
 *
 * - `compositor-state.ts` — the state record + host command functions
 * - `compositor-protocol.ts` — `reduceWorkerMessage` / `applyProtocolEffects`
 * - `compositor-mode.ts` — the startup↔steady `_tag` transition machine
 * - `compositor-startup.ts` / `startup-packet.ts` — lease + packet helpers
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import type { RuntimeCoordinator } from '@czap/core';
import type { FromWorkerMessage, WorkerConfig } from './messages.js';

// Re-export types from compositor-types
export type { CompositorWorkerStartupStage, CompositorWorkerStartupTelemetry } from './compositor-types.js';

import type {
  CompositorWorkerStartupTelemetry,
  CompositorWorkerStartupStage,
  CompositorWorkerShape,
  QuantizerBoundarySource,
} from './compositor-types.js';
import type { ContentAddress } from '@czap/core';

import { currentTimeNs, claimCompositorLease, parkOrDisposeCompositorLease, _send } from './compositor-startup.js';
import {
  createCompositorWorkerState,
  addQuantizer,
  removeQuantizer,
  evaluate,
  setBlendWeights,
  bootstrapResolvedState,
  applyResolvedState,
  requestCompute,
  onState,
  onResolvedStateAck,
  onMetrics,
  clearTransientState,
} from './compositor-state.js';
import { reduceWorkerMessage, applyProtocolEffects } from './compositor-protocol.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function _createCompositorWorker(
  config?: WorkerConfig,
  startupTelemetry?: CompositorWorkerStartupTelemetry,
): CompositorWorkerShape {
  const capacity = config?.poolCapacity ?? 64;
  const { worker, runtime, bootstrapSnapshot } = claimCompositorLease(capacity, startupTelemetry);
  const state = createCompositorWorkerState({ worker, runtime, capacity, bootstrapSnapshot, startupTelemetry });

  const handleMessage = (e: MessageEvent<FromWorkerMessage>): void => {
    const msg = e.data;
    if (!msg || typeof msg.type !== 'string') return;
    applyProtocolEffects(state, reduceWorkerMessage(state, msg));
  };

  const handleError = (e: ErrorEvent): void => {
    Diagnostics.error({
      source: 'czap/worker.compositor-worker',
      code: 'worker-unhandled-error',
      // The worker is minted from a Blob URL, so a strict CSP blocking
      // worker-src blob: is the dominant real-world cause of this event.
      message: `Compositor worker raised an unhandled error (often the Blob-URL worker being blocked by a strict CSP — allow worker-src blob:). Detail: ${e.message}`,
      detail: e.message,
    });
  };

  const listenerBindStartNs = currentTimeNs();
  worker.addEventListener('message', handleMessage);
  worker.addEventListener('error', handleError);
  startupTelemetry?.recordStage('listener-bind', currentTimeNs() - listenerBindStartNs);

  if (state.startupPacket.bootstrapMode === 'cold') {
    _send(worker, { type: 'init' });
  }

  return {
    get worker(): Worker {
      return worker;
    },

    get runtime(): RuntimeCoordinator.Shape {
      return runtime;
    },

    addQuantizer(
      nameOrBoundary: string | QuantizerBoundarySource,
      explicitBoundary?: {
        readonly id: ContentAddress;
        readonly states: readonly string[];
        readonly thresholds: readonly number[];
      },
    ): void {
      addQuantizer(state, nameOrBoundary, explicitBoundary);
    },

    removeQuantizer(name): void {
      removeQuantizer(state, name);
    },

    evaluate(name, value): void {
      evaluate(state, name, value);
    },

    setBlendWeights(name, weights): void {
      setBlendWeights(state, name, weights);
    },

    bootstrapResolvedState(states): void {
      bootstrapResolvedState(state, states);
    },

    applyResolvedState(states): void {
      applyResolvedState(state, states);
    },

    requestCompute(): void {
      requestCompute(state);
    },

    onState(callback): () => void {
      return onState(state, callback);
    },

    onResolvedStateAck(callback): () => void {
      return onResolvedStateAck(state, callback);
    },

    onMetrics(callback): () => void {
      return onMetrics(state, callback);
    },

    dispose(): void {
      clearTransientState(state);
      if (typeof worker.removeEventListener === 'function') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      }
      parkOrDisposeCompositorLease({
        worker,
        runtime,
        capacity,
        bootstrapSnapshot: Array.from(state.activeRegistrations.values()),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Factory namespace for the compositor worker.
 *
 * Call {@link CompositorWorker.create} on the main thread to spin up a
 * worker that evaluates quantizer boundaries and emits
 * {@link CompositorWorkerState} snapshots. The returned
 * {@link CompositorWorkerShape} owns the underlying `Worker` -- call
 * `dispose()` (or park via the lease pool) when finished.
 *
 * @example
 * ```ts
 * import { Boundary } from '@czap/core';
 * import { CompositorWorker } from '@czap/worker';
 *
 * const compositor = CompositorWorker.create({ poolCapacity: 64 });
 * // Boundary.make computes the content-addressed id; the quantizer
 * // name defaults to the boundary's input name ('brightness').
 * const brightness = Boundary.make({
 *   input: 'brightness',
 *   // at[i] is [lower bound, state]: 'dim' from 0, 'bright' from 0.5.
 *   at: [[0, 'dim'], [0.5, 'bright']],
 * });
 * compositor.addQuantizer(brightness);
 * const unsub = compositor.onState((state) => {
 *   // state.discrete.brightness === 'bright' | 'dim'
 * });
 * compositor.evaluate('brightness', 0.7); // 0.7 >= 0.5 -> 'bright'
 * compositor.requestCompute();
 * // ...later:
 * unsub();
 * compositor.dispose();
 * ```
 */
export const CompositorWorker = {
  /**
   * Spin up a new compositor worker. Returns immediately; the worker
   * posts `ready` asynchronously. Optionally provide startup telemetry
   * to capture per-stage timings.
   */
  create: _createCompositorWorker,
} as const;

export declare namespace CompositorWorker {
  /** Public host-side surface returned by {@link CompositorWorker.create}. */
  export type Shape = CompositorWorkerShape;
  /** Named startup stage reported to telemetry sinks. */
  export type StartupStage = CompositorWorkerStartupStage;
  /** Telemetry sink accepted by {@link CompositorWorker.create}. */
  export type StartupTelemetry = CompositorWorkerStartupTelemetry;
}

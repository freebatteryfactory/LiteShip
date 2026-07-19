/**
 * Compositor lease lifecycle, worker-URL/blob management, and the
 * timing/transfer helpers that bridge the host to the worker.
 *
 * The pure {@link StartupPacketState} accessor family lives in
 * `startup-packet.ts` (zero singleton dependency); it is re-exported here
 * so existing import sites keep one stable entry point.
 *
 * @module
 */

import { RuntimeCoordinator, StateName, rawIndexF32, systemClock } from '@liteship/core';
import type { ToWorkerMessage, BootstrapQuantizerRegistration, ResolvedStateEntry } from './messages.js';
import type {
  CompositorWorkerStartupTelemetry,
  CompositorWorkerStartupDiagnosticStage,
  ResolvedStateAckPayload,
  RuntimeSeedEntry,
  StandbyCompositorLease,
} from './compositor-types.js';
import { COMPOSITOR_WORKER_SCRIPT } from './compositor-script.js';
import { sameArray } from './startup-packet.js';

// Re-export the pure startup-packet family so `startup-packet.ts` need not
// be a second import source for existing call sites.
export {
  sameArray,
  sameNumericRecord,
  registrationsToRuntimeSeed,
  createStartupPacketState,
  buildStartupComputePacket,
  getStartupPacketRegistrations,
  getStartupPacketRuntimeSeed,
  setStartupPacketRegistration,
  removeStartupPacketRegistration,
  pushStartupPacketUpdate,
  filterStartupPacketUpdates,
  setStartupPacketInitialState,
  setStartupPacketBlendWeights,
  removeStartupPacketEntries,
  resetStartupPacketTransientState,
} from './startup-packet.js';

// ---------------------------------------------------------------------------
// Module-level cached state
// ---------------------------------------------------------------------------

let cachedCompositorWorkerUrl: string | null = null;
let cachedCreateObjectUrl: typeof URL.createObjectURL | null = null;
let cleanupRegistered = false;
let standbyCompositorLease: StandbyCompositorLease | null = null;

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

/**
 * Return the current high-resolution wall-clock time in nanoseconds.
 *
 * Reads through `@liteship/core`'s `systemClock` -- the single audited entropy
 * boundary -- which itself prefers `performance.now()` and falls back to
 * `Date.now()` where the performance timeline is absent. This is an
 * inherently-live observability read (it only feeds telemetry stage deltas,
 * never a reproducible artifact), so there is no caller-injected clock to
 * thread through: the boundary is the honest place to read the wall clock.
 */
export function currentTimeNs(): number {
  return systemClock.now() * 1e6;
}

/**
 * Forward a fine-grained startup-diagnostic duration sample to a
 * telemetry sink (if the sink opts into diagnostic stages).
 *
 * Safe to call when `telemetry` is undefined or does not implement
 * `recordDiagnosticStage` -- the call becomes a no-op.
 */
export function recordStartupDiagnosticStage(
  telemetry: CompositorWorkerStartupTelemetry | undefined,
  stage: CompositorWorkerStartupDiagnosticStage,
  durationNs: number,
): void {
  const recordDiagnosticStage = (
    telemetry as
      | (CompositorWorkerStartupTelemetry & {
          readonly recordDiagnosticStage?: (
            diagnosticStage: CompositorWorkerStartupDiagnosticStage,
            diagnosticDurationNs: number,
          ) => void;
        })
      | undefined
  )?.recordDiagnosticStage;

  recordDiagnosticStage?.(stage, durationNs);
}

/**
 * Notify a telemetry sink that the worker acknowledged a resolved-state
 * hydration. Safe to call when the sink does not implement
 * `onResolvedStateSettled`.
 */
export function notifyResolvedStateSettled(
  telemetry: CompositorWorkerStartupTelemetry | undefined,
  states: readonly ResolvedStateEntry[],
): void {
  const onResolvedStateSettled = (
    telemetry as
      | (CompositorWorkerStartupTelemetry & {
          readonly onResolvedStateSettled?: (settledStates: readonly ResolvedStateEntry[]) => void;
        })
      | undefined
  )?.onResolvedStateSettled;

  onResolvedStateSettled?.(states);
}

// ---------------------------------------------------------------------------
// Runtime-seed reconciliation
// ---------------------------------------------------------------------------

/**
 * Return `true` when the given runtime coordinator already has every
 * quantizer referenced by the runtime seed registered (by name).
 *
 * Used to decide whether a pre-warmed lease's runtime can be reused
 * as-is or must be reset before replay.
 */
export function runtimeMatchesStartupSeed(
  runtime: RuntimeCoordinator.Shape,
  runtimeSeed: readonly RuntimeSeedEntry[],
): boolean {
  const registeredNames = runtime.registeredNames();
  if (
    !sameArray(
      registeredNames,
      runtimeSeed.map((registration) => registration.name),
    )
  ) {
    return false;
  }

  for (const registration of runtimeSeed) {
    if (!runtime.hasQuantizer(registration.name)) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Compositor worker URL and blob management
// ---------------------------------------------------------------------------

function revokeCachedCompositorWorkerUrl(): void {
  if (!cachedCompositorWorkerUrl) {
    return;
  }

  URL.revokeObjectURL(cachedCompositorWorkerUrl);
  cachedCompositorWorkerUrl = null;
  cachedCreateObjectUrl = null;
}

function disposeStandbyCompositorLease(): void {
  standbyCompositorLease?.worker.terminate();
  standbyCompositorLease = null;
}

/** Typed helper that extracts globalThis.process without casting at call sites. */
function getNodeProcess(): { once?: (event: string, fn: () => void) => void } | null {
  /* v8 ignore next — `globalThis` is available in every ES2020+ host (Node, browsers,
     workers). The guard is defense-in-depth in case the module is ever loaded in a
     pre-ES2020 sandbox where `globalThis` is missing. */
  if (typeof globalThis === 'undefined' || !('process' in globalThis)) return null;
  const p = (globalThis as unknown as { process?: unknown }).process;
  /* v8 ignore next — Node's `process` is always the NodeJS.Process object; this guard
     covers hosts that define `process` as a non-object (e.g. a compatibility shim that
     sets it to `undefined` while still keeping the property slot). */
  if (typeof p !== 'object' || p === null) return null;
  return p as { once?: (event: string, fn: () => void) => void };
}

function registerCachedWorkerCleanup(): void {
  if (cleanupRegistered) {
    return;
  }

  cleanupRegistered = true;
  const cleanup = (): void => {
    disposeStandbyCompositorLease();
    revokeCachedCompositorWorkerUrl();
  };
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('pagehide', cleanup, { once: true });
    return;
  }

  const proc = getNodeProcess();
  if (proc !== null && typeof proc.once === 'function') proc.once('exit', cleanup);
}

function getCompositorWorkerUrl(): string {
  if (cachedCompositorWorkerUrl && cachedCreateObjectUrl === URL.createObjectURL) {
    return cachedCompositorWorkerUrl;
  }

  if (cachedCompositorWorkerUrl) {
    revokeCachedCompositorWorkerUrl();
  }

  cachedCompositorWorkerUrl = URL.createObjectURL(
    new Blob([COMPOSITOR_WORKER_SCRIPT], { type: 'application/javascript' }),
  );
  cachedCreateObjectUrl = URL.createObjectURL;
  registerCachedWorkerCleanup();
  return cachedCompositorWorkerUrl;
}

function createRawCompositorWorker(): Worker {
  const url = getCompositorWorkerUrl();
  return new Worker(url, { type: 'classic', name: 'liteship-compositor' });
}

function createRuntimeCoordinator(capacity: number): RuntimeCoordinator.Shape {
  return RuntimeCoordinator.create({
    capacity,
    name: 'liteship-worker-runtime',
  });
}

// ---------------------------------------------------------------------------
// Compositor lease lifecycle
// ---------------------------------------------------------------------------

/**
 * Claim a compositor lease: either hand back the standby pre-warmed
 * worker (if one is parked and matches the requested capacity) or mint a
 * fresh `Worker` + {@link RuntimeCoordinator}. Emits
 * `claim-or-create` and `coordinator-reset-or-create` stage samples to
 * the optional telemetry sink.
 *
 * @param capacity - Runtime coordinator capacity to request.
 * @param startupTelemetry - Optional sink for stage timings.
 * @returns The worker, its coordinator, and any bootstrap snapshot the
 *   parked lease brought with it.
 */
export function claimCompositorLease(
  capacity: number,
  startupTelemetry?: CompositorWorkerStartupTelemetry,
): {
  readonly worker: Worker;
  readonly runtime: RuntimeCoordinator.Shape;
  readonly bootstrapSnapshot: readonly BootstrapQuantizerRegistration[];
} {
  if (
    standbyCompositorLease &&
    (standbyCompositorLease.workerConstructor !== Worker ||
      standbyCompositorLease.createObjectUrl !== URL.createObjectURL ||
      standbyCompositorLease.capacity !== capacity)
  ) {
    disposeStandbyCompositorLease();
  }

  const claimStartNs = currentTimeNs();
  const claimedLease = standbyCompositorLease;
  standbyCompositorLease = null;
  const worker = claimedLease?.worker ?? createRawCompositorWorker();
  startupTelemetry?.recordStage('claim-or-create', currentTimeNs() - claimStartNs);

  const coordinatorStartNs = currentTimeNs();
  const runtime = claimedLease?.runtime ?? createRuntimeCoordinator(capacity);
  const bootstrapSnapshot = claimedLease?.bootstrapSnapshot ?? [];
  if (claimedLease) {
    const runtimeResetStartNs = currentTimeNs();
    runtime.reset();
    recordStartupDiagnosticStage(
      startupTelemetry,
      'coordinator-reset-or-create:runtime-reset-reuse',
      currentTimeNs() - runtimeResetStartNs,
    );
  }
  startupTelemetry?.recordStage('coordinator-reset-or-create', currentTimeNs() - coordinatorStartNs);

  return {
    worker,
    runtime,
    bootstrapSnapshot,
  };
}

/**
 * Park a compositor lease in the module-level standby slot so a future
 * {@link claimCompositorLease} can reuse it. If the standby slot is
 * already occupied, the incoming lease is disposed (`dispose` message +
 * `terminate()`) instead.
 */
export function parkOrDisposeCompositorLease(lease: {
  readonly worker: Worker;
  readonly runtime: RuntimeCoordinator.Shape;
  readonly capacity: number;
  readonly bootstrapSnapshot: readonly BootstrapQuantizerRegistration[];
}): void {
  if (
    !standbyCompositorLease &&
    typeof Worker !== 'undefined' &&
    Worker === lease.worker.constructor &&
    typeof URL.createObjectURL === 'function' &&
    URL.createObjectURL === cachedCreateObjectUrl
  ) {
    standbyCompositorLease = {
      ...lease,
      workerConstructor: Worker,
      createObjectUrl: URL.createObjectURL,
    };
    return;
  }

  _send(lease.worker, { type: 'dispose' });
  lease.worker.terminate();
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Internal `postMessage` helper with an explicit transfer-list default.
 * Named with a leading underscore to signal that host code should use
 * the typed methods on {@link CompositorWorkerShape} instead.
 */
export function _send(worker: Worker, msg: ToWorkerMessage, transfer?: Transferable[]): void {
  worker.postMessage(msg, transfer ?? []);
}

/**
 * Convert a registration's thresholds to a Float64Array for transfer.
 * Returns a new registration object with the typed array and the ArrayBuffer to transfer.
 */
export function prepareRegistrationForTransfer(registration: BootstrapQuantizerRegistration): {
  registration: BootstrapQuantizerRegistration;
  buffer: ArrayBuffer;
} {
  const f64 = new Float64Array(registration.thresholds);
  return {
    registration: { ...registration, thresholds: f64 },
    buffer: f64.buffer,
  };
}

/**
 * Prepare a list of registrations for transfer, returning new registrations
 * and the collected ArrayBuffers to include in the transfer list.
 */
export function prepareRegistrationsForTransfer(registrations: readonly BootstrapQuantizerRegistration[]): {
  registrations: readonly BootstrapQuantizerRegistration[];
  buffers: ArrayBuffer[];
} {
  const buffers: ArrayBuffer[] = [];
  const prepared = registrations.map((reg) => {
    const { registration, buffer } = prepareRegistrationForTransfer(reg);
    buffers.push(buffer);
    return registration;
  });
  return { registrations: prepared, buffers };
}

/**
 * Return `true` when two bootstrap registrations share the same
 * `boundaryId`, state list, and threshold list. Used to elide redundant
 * `add-quantizer` messages during bootstrap coalescing.
 */
export function sameBootstrapRegistration(
  left: BootstrapQuantizerRegistration | undefined,
  right: BootstrapQuantizerRegistration,
): boolean {
  if (!left) {
    return false;
  }

  return (
    left.boundaryId === right.boundaryId &&
    sameArray(left.states, right.states) &&
    sameArray(left.thresholds, right.thresholds)
  );
}

/**
 * Quantize a numeric value against a registration's thresholds and
 * return the corresponding state label. Falls back to `states[0]` if the
 * value lies below every threshold.
 */
export function evaluateRegistrationState(registration: BootstrapQuantizerRegistration, value: number): string {
  // Delegate to the single f32-canonical kernel so the host startup path agrees
  // with the worker inline (EVALUATE_THRESHOLDS_SOURCE) and the steady-state
  // compositor at threshold edges — no raw-f64 divergence on this seam.
  const index = rawIndexF32(registration.thresholds, value);
  return registration.states[index] ?? registration.states[0]!;
}

/**
 * Re-shape a {@link ResolvedStateAckPayload} into the flat
 * {@link ResolvedStateEntry} form that the main-thread state store
 * consumes. Propagates `ack.generation` into each entry.
 */
export function toResolvedStateEntriesFromAck(ack: ResolvedStateAckPayload): readonly ResolvedStateEntry[] {
  return ack.states.map((state) => ({
    name: state.name,
    state: StateName(state.state),
    generation: ack.generation,
  }));
}

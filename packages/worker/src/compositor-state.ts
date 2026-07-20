/**
 * Explicit state record for the host side of a compositor worker, plus the
 * standalone command functions that drive it.
 *
 * This replaces the former 521-line `_createCompositorWorker` closure that
 * bundled five concerns over ~10 captured `let` flags. Everything the
 * closure used to capture now lives on one inspectable
 * {@link CompositorWorkerRuntimeState} record, and every command
 * (`addQuantizer`, `evaluate`, `requestCompute`, …) is a standalone
 * function over that record — no hidden mutable flags a reader can't see.
 *
 * The protocol dispatch (worker→host messages) lives in
 * `compositor-protocol.ts` as a `reduce(state, msg) → effects` machine;
 * the startup-to-steady mode discriminant lives in `compositor-mode.ts`.
 *
 * @module
 */

import type { RuntimeCoordinator, ContentAddress } from '@liteship/core';
import { StateName as mkStateName } from '@liteship/core';
import type { WorkerUpdate, BootstrapQuantizerRegistration, ResolvedStateEntry } from './messages.js';
import { makeResolvedStateEnvelope } from './messages.js';
import type {
  CompositorWorkerState,
  ResolvedStateAckPayload,
  CompositorWorkerStartupTelemetry,
  QuantizerBoundarySource,
  WorkerMetrics,
} from './compositor-types.js';
import {
  currentTimeNs,
  recordStartupDiagnosticStage,
  _send,
  prepareRegistrationForTransfer,
  sameBootstrapRegistration,
  evaluateRegistrationState,
  buildStartupComputePacket,
  getStartupPacketRuntimeSeed,
  runtimeMatchesStartupSeed,
  setStartupPacketRegistration,
  pushStartupPacketUpdate,
  setStartupPacketInitialState,
  setStartupPacketBlendWeights,
  removeStartupPacketEntries,
  resetStartupPacketTransientState,
  createStartupPacketState,
} from './compositor-startup.js';
import type { StartupPacketState } from './compositor-types.js';
import { type CompositorMode, initialMode, isStartup, steadyMode } from './compositor-mode.js';

// ---------------------------------------------------------------------------
// Prepared-registration transfer cache
// ---------------------------------------------------------------------------

/** A registration whose thresholds have been packed into a transferable buffer. */
interface PreparedRegistration {
  readonly source: BootstrapQuantizerRegistration;
  readonly transferRegistration: BootstrapQuantizerRegistration;
  readonly buffer: ArrayBuffer;
}

// ---------------------------------------------------------------------------
// State record
// ---------------------------------------------------------------------------

/**
 * The complete host-side state of a compositor worker — every field the
 * old closure captured, made explicit. Concerns are grouped by comment:
 * worker handles, registration/snapshot tables, the update-batch
 * scheduler, the startup packet, the startup↔steady mode machine, and
 * the host-callback listener sets.
 */
export interface CompositorWorkerRuntimeState {
  // — Worker handles (stable for the lifetime of the state) —
  readonly worker: Worker;
  readonly runtime: RuntimeCoordinator;
  readonly capacity: number;
  readonly startupTelemetry: CompositorWorkerStartupTelemetry | undefined;

  // — Registration & snapshot tables —
  readonly snapshotByName: Map<string, BootstrapQuantizerRegistration>;
  readonly activeRegistrations: Map<string, BootstrapQuantizerRegistration>;
  readonly confirmedSnapshotNames: Set<string>;
  readonly preparedRegistrationCache: Map<string, PreparedRegistration>;
  readonly startupPacket: StartupPacketState;

  // — Update-batch scheduler (steady-state) —
  steadyStatePendingUpdates: WorkerUpdate[];
  flushScheduled: boolean;

  // — Startup↔steady mode machine (discriminant + timing) —
  mode: CompositorMode;

  // — Host-callback listeners —
  readonly stateListeners: Set<(state: CompositorWorkerState) => void>;
  readonly resolvedStateAckListeners: Set<(ack: ResolvedStateAckPayload) => void>;
  readonly metricsListeners: Set<(metrics: WorkerMetrics) => void>;

  // — Last-observed telemetry (diagnostic inspection) —
  lastMetrics: WorkerMetrics | null;
  lastWorkerError: string | null;
}

/**
 * Build the initial state record from a freshly claimed lease. Mirrors the
 * old closure's variable-initialization block one-for-one.
 */
export function createCompositorWorkerState(params: {
  readonly worker: Worker;
  readonly runtime: RuntimeCoordinator;
  readonly capacity: number;
  readonly bootstrapSnapshot: readonly BootstrapQuantizerRegistration[];
  readonly startupTelemetry: CompositorWorkerStartupTelemetry | undefined;
}): CompositorWorkerRuntimeState {
  const { worker, runtime, capacity, bootstrapSnapshot, startupTelemetry } = params;
  return {
    worker,
    runtime,
    capacity,
    startupTelemetry,
    snapshotByName: new Map(bootstrapSnapshot.map((registration) => [registration.name, registration] as const)),
    activeRegistrations: new Map(),
    confirmedSnapshotNames: new Set(),
    preparedRegistrationCache: new Map(),
    startupPacket: createStartupPacketState(bootstrapSnapshot.length > 0 ? 'warm-snapshot' : 'cold', bootstrapSnapshot),
    steadyStatePendingUpdates: [],
    flushScheduled: false,
    mode: initialMode(),
    stateListeners: new Set(),
    resolvedStateAckListeners: new Set(),
    metricsListeners: new Set(),
    lastMetrics: null,
    lastWorkerError: null,
  };
}

// ---------------------------------------------------------------------------
// Prepared-registration cache (transfer staging)
// ---------------------------------------------------------------------------

function getPreparedRegistration(
  state: CompositorWorkerRuntimeState,
  registration: BootstrapQuantizerRegistration,
): PreparedRegistration {
  const cached = state.preparedRegistrationCache.get(registration.name);
  /* v8 ignore next — current call sites always delete the cache entry in the same
     synchronous turn that sets it (see `consumePreparedRegistrations`), so this
     cache-hit arm is reserved for a future pre-flight path that warms the cache
     before dispatch; unreachable under today's code paths. */
  if (cached && cached.source === registration && cached.buffer.byteLength > 0) {
    return cached;
  }

  const { registration: transferRegistration, buffer } = prepareRegistrationForTransfer(registration);
  const prepared: PreparedRegistration = {
    source: registration,
    transferRegistration,
    buffer,
  };
  state.preparedRegistrationCache.set(registration.name, prepared);
  return prepared;
}

function consumePreparedRegistrations(
  state: CompositorWorkerRuntimeState,
  registrations: readonly BootstrapQuantizerRegistration[],
): { registrations: BootstrapQuantizerRegistration[]; buffers: ArrayBuffer[] } {
  const buffers: ArrayBuffer[] = [];
  const transferRegistrations = registrations.map((registration) => {
    const prepared = getPreparedRegistration(state, registration);
    state.preparedRegistrationCache.delete(registration.name);
    buffers.push(prepared.buffer);
    return prepared.transferRegistration;
  });

  return {
    registrations: transferRegistrations,
    buffers,
  };
}

// ---------------------------------------------------------------------------
// Update-batch scheduler (steady-state)
// ---------------------------------------------------------------------------

/**
 * Flush any batched steady-state updates to the worker in a single
 * `apply-updates` post. A no-op when the queue is empty. Bound and
 * scheduled via `queueMicrotask` by {@link queueUpdate}.
 */
export function flushPendingUpdates(state: CompositorWorkerRuntimeState): void {
  state.flushScheduled = false;
  if (state.steadyStatePendingUpdates.length === 0) {
    return;
  }

  const updates = state.steadyStatePendingUpdates;
  state.steadyStatePendingUpdates = [];
  _send(state.worker, {
    type: 'apply-updates',
    updates,
  });
}

/**
 * Queue a steady-state update. During startup the update is staged into
 * the startup packet instead; otherwise it batches and a microtask flush
 * is scheduled (coalescing a burst of updates into one worker post).
 */
function queueUpdate(state: CompositorWorkerRuntimeState, update: WorkerUpdate): void {
  if (isStartup(state.mode)) {
    pushStartupPacketUpdate(state.startupPacket, update);
    return;
  }

  state.steadyStatePendingUpdates.push(update);
  if (state.flushScheduled) {
    return;
  }

  state.flushScheduled = true;
  queueMicrotask(() => flushPendingUpdates(state));
}

// ---------------------------------------------------------------------------
// Snapshot bookkeeping
// ---------------------------------------------------------------------------

function markStartupBootstrapForRebuild(state: CompositorWorkerRuntimeState): void {
  if (state.startupPacket.bootstrapMode === 'warm-snapshot') {
    state.startupPacket.bootstrapMode = 'rebuild';
  }
}

function applyResolvedStatesToRuntime(
  state: CompositorWorkerRuntimeState,
  states: readonly ResolvedStateEntry[],
): void {
  for (const entry of states) {
    state.runtime.markDirty(entry.name);
    state.runtime.applyState(entry.name, entry.state);
  }
}

// ---------------------------------------------------------------------------
// Mode transition: startup → resolved-state / steady
// ---------------------------------------------------------------------------

/**
 * Leave startup mode and flush any staged registrations to the live
 * worker. Idempotent: if already steady, it simply flushes pending
 * updates. This is the seam the resolved-state path crosses before it can
 * speak to a live worker.
 */
function ensureResolvedStateMode(state: CompositorWorkerRuntimeState): void {
  if (!isStartup(state.mode)) {
    flushPendingUpdates(state);
    return;
  }

  state.mode = steadyMode();
  state.flushScheduled = false;
  state.steadyStatePendingUpdates = [];
  const registrations = Array.from(state.activeRegistrations.values());

  if (state.startupPacket.bootstrapMode !== 'cold') {
    _send(state.worker, { type: 'init' });
  }
  if (registrations.length > 0) {
    const { registrations: transferRegs, buffers } = consumePreparedRegistrations(state, registrations);
    _send(
      state.worker,
      {
        type: 'bootstrap-quantizers',
        registrations: transferRegs,
      },
      buffers,
    );
  }

  resetStartupPacketTransientState(state.startupPacket);
}

function sendResolvedStateMessage(
  state: CompositorWorkerRuntimeState,
  type: 'bootstrap-resolved-state' | 'apply-resolved-state',
  states: readonly ResolvedStateEntry[],
): void {
  if (states.length === 0) {
    return;
  }

  ensureResolvedStateMode(state);
  applyResolvedStatesToRuntime(state, states);
  const expectAck = state.resolvedStateAckListeners.size > 0 || state.startupTelemetry !== undefined;
  const dispatchStartNs = currentTimeNs();
  _send(state.worker, makeResolvedStateEnvelope(type, states, expectAck));
  const dispatchCompletedNs = currentTimeNs();
  // After ensureResolvedStateMode the machine is always steady.
  if (state.mode._tag === 'steady') {
    state.mode.resolvedStateDispatchCompletedNs = dispatchCompletedNs;
    state.mode.resolvedStateAckPending = expectAck;
  }
  recordStartupDiagnosticStage(
    state.startupTelemetry,
    'request-compute:dispatch-send',
    dispatchCompletedNs - dispatchStartNs,
  );
  recordStartupDiagnosticStage(state.startupTelemetry, 'request-compute:packet-finalize', 0);
  recordStartupDiagnosticStage(state.startupTelemetry, 'request-compute:post-send-bookkeeping', 0);
}

// ---------------------------------------------------------------------------
// Host commands (the public CompositorWorkerShape surface)
// ---------------------------------------------------------------------------

/**
 * Register a quantizer, either from a `Boundary.make` result (single-arg)
 * or under an explicit name with a branded boundary (two-arg).
 */
export function addQuantizer(
  state: CompositorWorkerRuntimeState,
  nameOrBoundary: string | QuantizerBoundarySource,
  explicitBoundary?: {
    readonly id: ContentAddress;
    readonly states: readonly string[];
    readonly thresholds: readonly number[];
  },
): void {
  // Boundary-first form: the quantizer name defaults to the boundary's
  // input name; id/states/thresholds are derived. BoundaryDef.states
  // carries plain strings, so the labels are branded here — the
  // registration protocol speaks StateName.
  const name = typeof nameOrBoundary === 'string' ? nameOrBoundary : nameOrBoundary.input;
  const boundary =
    typeof nameOrBoundary === 'string'
      ? { ...explicitBoundary!, states: explicitBoundary!.states.map((s) => mkStateName(s)) }
      : { ...nameOrBoundary, states: nameOrBoundary.states.map((s) => mkStateName(s)) };
  const registration = {
    name,
    boundaryId: boundary.id,
    states: boundary.states,
    thresholds: boundary.thresholds,
  } satisfies BootstrapQuantizerRegistration;
  const previousRequested = state.activeRegistrations.get(name);
  if (sameBootstrapRegistration(previousRequested, registration)) {
    if (state.startupPacket.bootstrapMode === 'warm-snapshot' && state.snapshotByName.has(name)) {
      state.confirmedSnapshotNames.add(name);
    }
    return;
  }

  state.preparedRegistrationCache.delete(name);
  state.activeRegistrations.set(name, registration);
  const snapshotRegistration = state.snapshotByName.get(name);
  const isSnapshotMatch = sameBootstrapRegistration(snapshotRegistration, registration);

  if (state.runtime.hasQuantizer(name) && !isSnapshotMatch) {
    state.runtime.removeQuantizer(name);
  }
  if (!state.runtime.hasQuantizer(name)) {
    state.runtime.registerQuantizer(name, boundary.states);
  }

  if (state.startupPacket.bootstrapMode === 'warm-snapshot' && isSnapshotMatch) {
    state.confirmedSnapshotNames.add(name);
    return;
  }

  state.confirmedSnapshotNames.delete(name);
  if (snapshotRegistration || state.startupPacket.bootstrapMode === 'warm-snapshot') {
    markStartupBootstrapForRebuild(state);
  }

  if (isStartup(state.mode)) {
    setStartupPacketRegistration(state.startupPacket, registration);
    return;
  }

  const { registrations: transferRegistrations, buffers } = consumePreparedRegistrations(state, [registration]);
  _send(state.worker, { type: 'add-quantizer', ...transferRegistrations[0]! }, buffers);
}

/** Remove a quantizer from the worker. */
export function removeQuantizer(state: CompositorWorkerRuntimeState, name: string): void {
  state.preparedRegistrationCache.delete(name);
  state.activeRegistrations.delete(name);
  state.confirmedSnapshotNames.delete(name);
  state.runtime.removeQuantizer(name);
  if (state.snapshotByName.has(name)) {
    markStartupBootstrapForRebuild(state);
  }

  if (isStartup(state.mode)) {
    removeStartupPacketEntries(state.startupPacket, name);
    return;
  }
  queueUpdate(state, { type: 'remove-quantizer', name });
}

/** Evaluate a quantizer against a numeric value (threshold-based). */
export function evaluate(state: CompositorWorkerRuntimeState, name: string, value: number): void {
  if (isStartup(state.mode) && state.snapshotByName.has(name) && !state.confirmedSnapshotNames.has(name)) {
    markStartupBootstrapForRebuild(state);
  }
  if (isStartup(state.mode)) {
    const activeRegistration = state.activeRegistrations.get(name);
    if (activeRegistration) {
      const nextState = evaluateRegistrationState(activeRegistration, value);
      if (nextState !== activeRegistration.states[0]) {
        state.confirmedSnapshotNames.delete(name);
      }
      setStartupPacketInitialState(state.startupPacket, activeRegistration, nextState);
      state.runtime.markDirty(name);
      return;
    }
  }
  state.runtime.markDirty(name);
  queueUpdate(state, { type: 'evaluate', name, value });
}

/** Override blend weights for a quantizer. */
export function setBlendWeights(
  state: CompositorWorkerRuntimeState,
  name: string,
  weights: Record<string, number>,
): void {
  if (isStartup(state.mode) && state.snapshotByName.has(name) && !state.confirmedSnapshotNames.has(name)) {
    markStartupBootstrapForRebuild(state);
  }
  if (isStartup(state.mode) && setStartupPacketBlendWeights(state.startupPacket, name, weights)) {
    state.confirmedSnapshotNames.delete(name);
    state.runtime.markDirty(name);
    return;
  }
  state.runtime.markDirty(name);
  queueUpdate(state, { type: 'set-blend', name, weights });
}

/** Seed resolved quantizer state into the worker without raw threshold evaluation. */
export function bootstrapResolvedState(
  state: CompositorWorkerRuntimeState,
  states: readonly ResolvedStateEntry[],
): void {
  sendResolvedStateMessage(state, 'bootstrap-resolved-state', states);
}

/** Mirror resolved quantizer state updates into the worker without raw threshold evaluation. */
export function applyResolvedState(state: CompositorWorkerRuntimeState, states: readonly ResolvedStateEntry[]): void {
  sendResolvedStateMessage(state, 'apply-resolved-state', states);
}

/**
 * Request a compute. On the FIRST call this crosses the startup seam:
 * either a fast `warm-reset`+`compute` (when the warm snapshot still
 * matches) or a single coalesced `startup-compute` packet. Subsequent
 * calls simply flush pending updates and send `compute`.
 */
export function requestCompute(state: CompositorWorkerRuntimeState): void {
  if (!isStartup(state.mode)) {
    flushPendingUpdates(state);
    _send(state.worker, { type: 'compute' });
    return;
  }

  const runtimeSeed = getStartupPacketRuntimeSeed(state.startupPacket);
  if (
    state.startupPacket.bootstrapMode === 'warm-snapshot' &&
    state.activeRegistrations.size === state.snapshotByName.size &&
    state.confirmedSnapshotNames.size === state.snapshotByName.size &&
    runtimeMatchesStartupSeed(state.runtime, runtimeSeed)
  ) {
    const dispatchStartNs = currentTimeNs();
    _send(state.worker, { type: 'warm-reset' });
    _send(state.worker, { type: 'compute' });
    const dispatchCompletedNs = currentTimeNs();
    recordStartupDiagnosticStage(
      state.startupTelemetry,
      'request-compute:dispatch-send',
      dispatchCompletedNs - dispatchStartNs,
    );
    recordStartupDiagnosticStage(state.startupTelemetry, 'request-compute:packet-finalize', 0);
    recordStartupDiagnosticStage(state.startupTelemetry, 'request-compute:post-send-bookkeeping', 0);
    state.mode = steadyMode({ firstStateDispatchCompletedNs: dispatchCompletedNs, firstStatePending: true });
    return;
  }

  const packetFinalizeStartNs = currentTimeNs();
  const packet = buildStartupComputePacket(state.startupPacket);
  if (state.startupPacket.bootstrapMode === 'rebuild') {
    if (!runtimeMatchesStartupSeed(state.runtime, runtimeSeed)) {
      state.runtime.reset(runtimeSeed);
    }
  }
  const packetFinalizeEndNs = currentTimeNs();
  recordStartupDiagnosticStage(
    state.startupTelemetry,
    'request-compute:packet-finalize',
    packetFinalizeEndNs - packetFinalizeStartNs,
  );

  state.flushScheduled = false;
  const { registrations: transferRegs, buffers } = consumePreparedRegistrations(state, packet.registrations);
  const transferPacket = { ...packet, registrations: transferRegs };
  const dispatchStartNs = currentTimeNs();
  _send(
    state.worker,
    {
      type: 'startup-compute',
      packet: transferPacket,
    },
    buffers,
  );
  const dispatchCompletedNs = currentTimeNs();
  recordStartupDiagnosticStage(
    state.startupTelemetry,
    'request-compute:dispatch-send',
    dispatchCompletedNs - dispatchStartNs,
  );
  recordStartupDiagnosticStage(state.startupTelemetry, 'request-compute:post-send-bookkeeping', 0);
  state.mode = steadyMode({ firstStateDispatchCompletedNs: dispatchCompletedNs, firstStatePending: true });
}

// ---------------------------------------------------------------------------
// Listener subscription + disposal
// ---------------------------------------------------------------------------

/** Subscribe to state updates. Returns an unsubscribe function. */
export function onState(state: CompositorWorkerRuntimeState, callback: (s: CompositorWorkerState) => void): () => void {
  state.stateListeners.add(callback);
  return () => {
    state.stateListeners.delete(callback);
  };
}

/** Subscribe to resolved-state acknowledgements. Returns an unsubscribe function. */
export function onResolvedStateAck(
  state: CompositorWorkerRuntimeState,
  callback: (ack: ResolvedStateAckPayload) => void,
): () => void {
  state.resolvedStateAckListeners.add(callback);
  return () => {
    state.resolvedStateAckListeners.delete(callback);
  };
}

/** Subscribe to metrics updates. Returns an unsubscribe function. */
export function onMetrics(state: CompositorWorkerRuntimeState, callback: (metrics: WorkerMetrics) => void): () => void {
  state.metricsListeners.add(callback);
  return () => {
    state.metricsListeners.delete(callback);
  };
}

/** Reset the transient/per-session fields of the state record on dispose. */
export function clearTransientState(state: CompositorWorkerRuntimeState): void {
  resetStartupPacketTransientState(state.startupPacket);
  state.steadyStatePendingUpdates = [];
  state.flushScheduled = false;
  state.stateListeners.clear();
  state.resolvedStateAckListeners.clear();
  state.metricsListeners.clear();
  state.preparedRegistrationCache.clear();
  state.lastMetrics = null;
  state.lastWorkerError = null;
}

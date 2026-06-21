/**
 * Pure {@link StartupPacketState} accessor family for the CompositorWorker
 * startup pipeline.
 *
 * Every function here is a standalone transform over an explicit
 * {@link StartupPacketState} record — there is **no** module-level mutable
 * state, no singleton, and no `Worker`/`URL` dependency. The singleton
 * lifecycle (blob-URL caching, lease pooling) lives in
 * `compositor-startup.ts`; this module is the part that is trivially
 * unit-testable in isolation.
 *
 * @module
 */

import { StateName } from '@czap/core';
import type {
  WorkerUpdate,
  BootstrapQuantizerRegistration,
  StartupComputePacket,
} from './messages.js';
import type { StartupPacketState, RuntimeSeedEntry } from './compositor-types.js';

// ---------------------------------------------------------------------------
// Structural equality helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Structural equality for two `ArrayLike` sequences (same length, same
 * `===` elements at every index). Works for both plain arrays and typed
 * arrays.
 */
export function sameArray<T>(left: ArrayLike<T>, right: ArrayLike<T>): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

/**
 * Structural equality check for `Record<string, number>` blend-weight
 * maps. `undefined === undefined` is true; mismatched presence is false.
 */
export function sameNumericRecord(
  left: Record<string, number> | undefined,
  right: Record<string, number> | undefined,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Startup packet construction & projection
// ---------------------------------------------------------------------------

/**
 * Project a set of bootstrap registrations down to the minimal
 * `{ name, states }` shape the runtime coordinator needs to seed its
 * quantizer registry.
 */
export function registrationsToRuntimeSeed(
  registrations: readonly BootstrapQuantizerRegistration[],
): readonly RuntimeSeedEntry[] {
  return registrations.map((registration) => ({
    name: registration.name,
    states: registration.states,
  }));
}

/**
 * Build a fresh {@link StartupPacketState} seeded with an initial
 * bootstrap mode and registration list. Used by the compositor worker to
 * stage messages before flushing them in a single `startup-compute` post.
 */
export function createStartupPacketState(
  bootstrapMode: StartupComputePacket['bootstrapMode'],
  initialRegistrations: readonly BootstrapQuantizerRegistration[] = [],
): StartupPacketState {
  return {
    bootstrapMode,
    registrations: new Map(initialRegistrations.map((registration) => [registration.name, registration] as const)),
    registrationList: initialRegistrations.length > 0 ? [...initialRegistrations] : [],
    runtimeSeedList: initialRegistrations.length > 0 ? registrationsToRuntimeSeed(initialRegistrations) : [],
    updates: [],
    runtimeSeedDirty: false,
  };
}

/**
 * Snapshot a {@link StartupPacketState} into an immutable
 * {@link StartupComputePacket} suitable for `postMessage`.
 */
export function buildStartupComputePacket(packet: StartupPacketState): StartupComputePacket {
  const builtPacket = {
    bootstrapMode: packet.bootstrapMode,
    registrations: getStartupPacketRegistrations(packet),
    updates: packet.updates,
  };

  return builtPacket;
}

/**
 * Return the ordered list of registrations in the startup packet,
 * caching the result so repeated reads are O(1).
 */
export function getStartupPacketRegistrations(packet: StartupPacketState): readonly BootstrapQuantizerRegistration[] {
  if (packet.registrationList !== null) {
    return packet.registrationList;
  }

  packet.registrationList = Array.from(packet.registrations.values());
  return packet.registrationList;
}

/**
 * Return the runtime-seed projection of the startup packet's
 * registrations, recomputing on demand if invalidated.
 */
export function getStartupPacketRuntimeSeed(packet: StartupPacketState): readonly RuntimeSeedEntry[] {
  if (packet.runtimeSeedList !== null && !packet.runtimeSeedDirty) {
    return packet.runtimeSeedList;
  }

  packet.runtimeSeedList = registrationsToRuntimeSeed(getStartupPacketRegistrations(packet));
  packet.runtimeSeedDirty = false;
  return packet.runtimeSeedList;
}

// ---------------------------------------------------------------------------
// Startup packet mutation
// ---------------------------------------------------------------------------

/**
 * Insert or overwrite a registration in the startup packet, invalidating
 * derived caches. Pass `invalidateRuntimeSeed: false` when the caller
 * already knows the runtime seed is structurally unchanged (e.g. only
 * initial state or blend weights changed).
 */
export function setStartupPacketRegistration(
  packet: StartupPacketState,
  registration: BootstrapQuantizerRegistration,
  invalidateRuntimeSeed = true,
): void {
  packet.registrations.set(registration.name, registration);
  packet.registrationList = null;
  if (invalidateRuntimeSeed) {
    packet.runtimeSeedList = null;
    packet.runtimeSeedDirty = true;
  }
}

/**
 * Drop a registration by name from the startup packet and invalidate
 * derived caches.
 */
export function removeStartupPacketRegistration(packet: StartupPacketState, name: string): void {
  packet.registrations.delete(name);
  packet.registrationList = null;
  packet.runtimeSeedList = null;
  packet.runtimeSeedDirty = true;
}

/**
 * Queue a {@link WorkerUpdate} to be replayed after bootstrap. Order is
 * preserved to match main-thread issue order.
 */
export function pushStartupPacketUpdate(packet: StartupPacketState, update: WorkerUpdate): void {
  packet.updates.push(update);
}

/**
 * Filter the packet's pending update queue in-place. Typically used to
 * drop redundant updates (e.g. newer `set-blend` supersedes older ones).
 */
export function filterStartupPacketUpdates(packet: StartupPacketState, keep: (update: WorkerUpdate) => boolean): void {
  if (packet.updates.length === 0) {
    return;
  }
  const filtered = packet.updates.filter(keep);
  if (filtered.length !== packet.updates.length) {
    packet.updates = filtered;
  }
}

/**
 * Merge an updated initial-state assignment into an existing registration.
 * Also scrubs any queued `evaluate` update targeting the same quantizer,
 * since the new initial state supersedes it.
 */
export function setStartupPacketInitialState(
  packet: StartupPacketState,
  registration: BootstrapQuantizerRegistration,
  state: string,
): void {
  const currentRegistration = packet.registrations.get(registration.name)!;

  const defaultState = currentRegistration.states[0];
  const nextRegistration =
    state === defaultState
      ? (() => {
          const { initialState: _initialState, ...withoutInitialState } = currentRegistration;
          return withoutInitialState;
        })()
      : { ...currentRegistration, initialState: StateName(state) };
  const nextInitialState = 'initialState' in nextRegistration ? nextRegistration.initialState : undefined;
  if (
    currentRegistration.boundaryId !== nextRegistration.boundaryId ||
    !sameArray(currentRegistration.states, nextRegistration.states) ||
    !sameArray(currentRegistration.thresholds, nextRegistration.thresholds) ||
    currentRegistration.initialState !== nextInitialState ||
    !sameNumericRecord(currentRegistration.blendWeights, nextRegistration.blendWeights)
  ) {
    setStartupPacketRegistration(packet, nextRegistration, false);
  }
  filterStartupPacketUpdates(packet, (update) => !(update.type === 'evaluate' && update.name === registration.name));
}

/**
 * Merge updated blend weights for an existing registration. Returns
 * `false` when no registration with that name is present (the update is
 * ignored). Scrubs superseded `set-blend` updates from the queue.
 */
export function setStartupPacketBlendWeights(
  packet: StartupPacketState,
  name: string,
  weights: Record<string, number>,
): boolean {
  const registration = packet.registrations.get(name);
  if (!registration) {
    return false;
  }

  if (!sameNumericRecord(registration.blendWeights, weights)) {
    setStartupPacketRegistration(
      packet,
      {
        ...registration,
        blendWeights: weights,
      },
      false,
    );
  }
  filterStartupPacketUpdates(packet, (update) => !(update.type === 'set-blend' && update.name === name));
  return true;
}

/**
 * Remove a registration and every pending update targeting it.
 * Equivalent to undoing `add-quantizer` + any in-flight mutations.
 */
export function removeStartupPacketEntries(packet: StartupPacketState, name: string): void {
  removeStartupPacketRegistration(packet, name);
  if (packet.updates.length === 0) {
    return;
  }

  const filtered = packet.updates.filter((update) => update.name !== name);
  if (filtered.length !== packet.updates.length) {
    packet.updates = filtered;
  }
}

/**
 * Clear all transient state on a startup packet, leaving only the
 * `bootstrapMode` in place. Used when the lease is recycled and the
 * caller wants to start accumulating fresh messages.
 */
export function resetStartupPacketTransientState(packet: StartupPacketState): void {
  packet.registrations.clear();
  packet.registrationList = [];
  packet.runtimeSeedList = [];
  packet.updates = [];
  packet.runtimeSeedDirty = false;
}

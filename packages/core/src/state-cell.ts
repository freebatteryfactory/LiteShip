/**
 * StateCell / ProjectionState — typed authority over the coarse
 * graph/boundary/quantizer/dirty model (#130 child 5).
 *
 * Synchronous snapshots backed by {@link RuntimeCoordinator} dense stores and
 * explicit generation counters. NOT fine-grained auto-tracking reactivity —
 * no SolidJS-style tracking, no Effect {@link Cell} subscriptions.
 *
 * Discrete cells are replayable (graph patch / receipt chain, #133). Continuous
 * cells carry ephemeral transients that must NOT replay.
 *
 * @module
 */

import { StateName as mkStateName, type StateName } from './brands.js';
import { RuntimeCoordinator } from './runtime-coordinator.js';
import type { RuntimeCoordinatorShape } from './runtime-coordinator.js';
import { ValidationError } from '@czap/error';

/** Which subsystem owns a cell's value — the authority source. */
export type StateAuthority = 'quantizer' | 'graph' | 'policy' | 'tier' | 'synthetic';

/** Replay discriminator: discrete crossings replay; continuous transients do not. */
export type StateCellKind = 'discrete' | 'continuous';

/** Immutable snapshot of one named state authority cell. */
export interface StateCell<S extends string = string> {
  readonly _tag: 'StateCell';
  readonly name: string;
  readonly kind: StateCellKind;
  readonly authority: StateAuthority;
  readonly state: StateName<S>;
  readonly stateIndex: number;
  readonly dirtyEpoch: number;
  /** Monotonic generation — increments on discrete state changes (gap-replay ordering). */
  readonly generation: number;
  /** Derived: only discrete cells may enter patch/receipt replay paths (#133). */
  readonly replayable: boolean;
  /** Continuous-only live scalar when {@link kind} is `'continuous'`. */
  readonly value?: number;
}

/** Evidence of which source drove resolution — proto-ProjectionState receipt (#118). */
export interface StateResolutionReceipt {
  readonly source: StateAuthority;
  readonly detail?: string;
}

/** Per-projection typed authority aggregate consumed by emitters. */
export interface ProjectionState<S extends string = string> {
  readonly _tag: 'ProjectionState';
  readonly projection: string;
  readonly cells: Readonly<Record<string, StateCell<S>>>;
  /** Composite dirty epoch — max of constituent cells. */
  readonly dirtyEpoch: number;
  /** Primary discrete state for `data-czap-state` / CSS state selectors. */
  readonly resolvedState: StateName<S>;
  readonly resolution?: StateResolutionReceipt;
}

/** Worker/bootstrap interop — mirrors `ResolvedStateEntry` in `@czap/worker`. */
export interface ResolvedStateSnapshot {
  readonly name: string;
  readonly state: StateName;
  readonly generation: number;
}

interface RegisteredCell {
  readonly states: readonly string[];
  authority: StateAuthority;
  kind: StateCellKind;
  generation: number;
  currentState: string;
  continuousValue?: number;
}

/** Options for {@link StateCellStoreShape.register}. */
export interface StateCellRegisterOptions {
  readonly authority?: StateAuthority;
  readonly kind?: StateCellKind;
}

/** Options for {@link StateCellStoreShape.projectionState}. */
export interface ProjectionStateOptions {
  readonly quantizerNames?: readonly string[];
  readonly resolution?: StateResolutionReceipt;
}

/** Live store — coarse authority registry over a {@link RuntimeCoordinator}. */
export interface StateCellStoreShape {
  readonly runtime: RuntimeCoordinatorShape;
  register(name: string, states: readonly string[], options?: StateCellRegisterOptions): void;
  unregister(name: string): void;
  applyDiscrete(name: string, state: string, authority?: StateAuthority): StateCell;
  writeContinuous(name: string, value: number): StateCell;
  hydrateDiscrete(name: string, state: string, generation: number, authority?: StateAuthority): StateCell;
  markDirty(name: string): void;
  snapshot(name: string): StateCell | undefined;
  projectionState(projection: string, options?: ProjectionStateOptions): ProjectionState;
  reset(registrations?: readonly { readonly name: string; readonly states: readonly string[] }[]): void;
}

function makeCell(
  name: string,
  kind: StateCellKind,
  authority: StateAuthority,
  state: string,
  stateIndex: number,
  dirtyEpoch: number,
  generation: number,
  value?: number,
): StateCell {
  return Object.freeze({
    _tag: 'StateCell',
    name,
    kind,
    authority,
    state: mkStateName(state),
    stateIndex,
    dirtyEpoch,
    generation,
    replayable: kind === 'discrete',
    ...(value !== undefined ? { value } : {}),
  }) as StateCell;
}

function _createStore(runtime?: RuntimeCoordinatorShape): StateCellStoreShape {
  const coordinator = runtime ?? RuntimeCoordinator.create();
  const registry = new Map<string, RegisteredCell>();

  const requireEntry = (name: string, op: string): RegisteredCell => {
    const entry = registry.get(name);
    if (!entry) {
      throw ValidationError(op, `unknown cell "${name}"`);
    }
    return entry;
  };

  const buildSnapshot = (name: string): StateCell | undefined => {
    const entry = registry.get(name);
    if (!entry) return undefined;

    const state = entry.kind === 'continuous' ? (entry.states[0] ?? 'live') : entry.currentState;

    return makeCell(
      name,
      entry.kind,
      entry.authority,
      state,
      coordinator.getStateIndex(name),
      coordinator.getDirtyEpoch(name),
      entry.generation,
      entry.continuousValue,
    );
  };

  return {
    runtime: coordinator,

    register(name, states, options) {
      if (states.length === 0) {
        throw ValidationError('StateCellStore.register', `states must be non-empty for "${name}"`);
      }

      const authority = options?.authority ?? 'quantizer';
      const kind = options?.kind ?? 'discrete';

      if (!coordinator.hasQuantizer(name)) {
        coordinator.registerQuantizer(name, states);
      }

      registry.set(name, {
        states,
        authority,
        kind,
        generation: 0,
        currentState: states[0]!,
        continuousValue: kind === 'continuous' ? 0 : undefined,
      });
    },

    unregister(name) {
      registry.delete(name);
      coordinator.removeQuantizer(name);
    },

    applyDiscrete(name, state, authority) {
      const entry = requireEntry(name, 'StateCellStore.applyDiscrete');
      if (entry.kind !== 'discrete') {
        throw ValidationError('StateCellStore.applyDiscrete', `"${name}" is continuous, not discrete`);
      }

      const prevIndex = coordinator.getStateIndex(name);
      const nextIndex = coordinator.applyState(name, state);
      entry.currentState = entry.states[nextIndex] ?? state;
      if (authority !== undefined) entry.authority = authority;
      if (nextIndex !== prevIndex) {
        entry.generation += 1;
      }
      coordinator.markDirty(name);

      return buildSnapshot(name)!;
    },

    writeContinuous(name, value) {
      const entry = requireEntry(name, 'StateCellStore.writeContinuous');
      if (entry.kind !== 'continuous') {
        throw ValidationError('StateCellStore.writeContinuous', `"${name}" is discrete, not continuous`);
      }

      entry.continuousValue = value;
      coordinator.markDirty(name);

      return buildSnapshot(name)!;
    },

    hydrateDiscrete(name, state, generation, authority) {
      const entry = requireEntry(name, 'StateCellStore.hydrateDiscrete');
      if (entry.kind !== 'discrete') {
        throw ValidationError('StateCellStore.hydrateDiscrete', `"${name}" is continuous, not discrete`);
      }

      coordinator.applyState(name, state);
      entry.currentState = state;
      entry.generation = generation;
      if (authority !== undefined) entry.authority = authority;
      coordinator.markDirty(name);

      return buildSnapshot(name)!;
    },

    markDirty(name) {
      coordinator.markDirty(name);
    },

    snapshot(name) {
      return buildSnapshot(name);
    },

    projectionState(projection, options) {
      return ProjectionState.fromCells(
        projection,
        collectCells(registry, buildSnapshot, options?.quantizerNames),
        options?.resolution,
      );
    },

    reset(registrations) {
      registry.clear();
      coordinator.reset(registrations);
      for (const registration of registrations ?? []) {
        this.register(registration.name, registration.states);
      }
    },
  };
}

function collectCells(
  registry: ReadonlyMap<string, RegisteredCell>,
  buildSnapshot: (name: string) => StateCell | undefined,
  quantizerNames?: readonly string[],
): Readonly<Record<string, StateCell>> {
  const names = quantizerNames ?? Array.from(registry.keys());
  const cells: Record<string, StateCell> = Object.create(null);

  for (const name of names) {
    const cell = buildSnapshot(name);
    if (cell) cells[name] = cell;
  }

  return Object.freeze(cells);
}

/**
 * StateCell — frozen authority snapshot helpers.
 */
export const StateCell = {
  /** Build a frozen snapshot directly (tests, hydration, receipts). */
  snapshot: makeCell,
  /** Whether a cell may enter graph patch / receipt replay paths. */
  isReplayable: (cell: StateCell): boolean => cell.replayable,
  /** Build from a worker/bootstrap resolved-state entry. */
  fromResolved(
    entry: ResolvedStateSnapshot,
    authority: StateAuthority = 'quantizer',
    states: readonly string[] = [entry.state],
  ): StateCell {
    const index = Math.max(0, states.indexOf(entry.state));
    return makeCell(entry.name, 'discrete', authority, entry.state, index, 0, entry.generation);
  },
};

/**
 * ProjectionState — per-projection typed authority aggregate.
 */
export const ProjectionState = {
  /** Build from an explicit cell map. */
  fromCells(
    projection: string,
    cells: Readonly<Record<string, StateCell>>,
    resolution?: StateResolutionReceipt,
  ): ProjectionState {
    let dirtyEpoch = 0;
    let resolvedState: StateName | undefined;

    for (const cell of Object.values(cells)) {
      if (cell.dirtyEpoch > dirtyEpoch) dirtyEpoch = cell.dirtyEpoch;
      if (resolvedState === undefined && cell.kind === 'discrete') {
        resolvedState = cell.state;
      }
    }

    if (resolvedState === undefined) {
      throw ValidationError('ProjectionState.fromCells', 'at least one discrete cell is required');
    }

    return Object.freeze({
      _tag: 'ProjectionState' as const,
      projection,
      cells: Object.freeze({ ...cells }),
      dirtyEpoch,
      resolvedState,
      resolution,
    });
  },
};

/** Namespace entry point for the coarse authority store. */
export const StateCellStore = {
  /** Create a store backed by a fresh or supplied {@link RuntimeCoordinator}. */
  create: _createStore,
};

export declare namespace StateCell {
  /** Structural shape of a {@link StateCell}. */
  export type Shape<S extends string = string> = StateCell<S>;
  /** Alias for {@link StateAuthority}. */
  export type Authority = StateAuthority;
  /** Alias for {@link StateCellKind}. */
  export type Kind = StateCellKind;
}

export declare namespace ProjectionState {
  /** Structural shape of a {@link ProjectionState}. */
  export type Shape<S extends string = string> = ProjectionState<S>;
  /** Alias for {@link StateResolutionReceipt}. */
  export type ResolutionReceipt = StateResolutionReceipt;
}

export declare namespace StateCellStore {
  /** Structural shape of a {@link StateCellStore}. */
  export type Shape = StateCellStoreShape;
}

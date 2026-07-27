/**
 * ECS -- Entity, Part, System, World.
 *
 * Composition over inheritance. Entities are bags of parts,
 * systems operate on entities matching part queries.
 *
 * @module
 */

import { Lifetime, attachLifetime } from './reactive/lifetime.js';
import type { AsyncOwnedResource } from './reactive/lifetime.js';
import type { SchemaPort } from './schema/schema-port.js';

/** Nominal-typed identifier for an ECS entity — a branded string minted via the {@link EntityId} helper. */
export type EntityId = string & { readonly _brand: 'EntityId' };

/** Brand an arbitrary string as an `EntityId`. Sanctioned single-site cast. */
export const EntityId = (value: string): EntityId => value as EntityId;

import { fnv1aBytes } from './evidence/fnv.js';
import { CanonicalCbor } from './schema/cbor.js';
import { ValidationError } from '@liteship/error';

/** One ECS entity and its immutable component view. */
export interface Entity {
  readonly id: EntityId;
  readonly components: ReadonlyMap<string, unknown>;
}

/** One named, schema-validated ECS component declaration. */
export interface Part<T = unknown> {
  readonly name: string;
  readonly schema: SchemaPort<T>;
}

// ---------------------------------------------------------------------------
// Dense Component Storage -- Float64Array-backed, zero-allocation iteration
// ---------------------------------------------------------------------------

const DENSE_SENTINEL = -Infinity;

/** Fixed-capacity numeric component storage with dense iteration. */
export interface DenseStore {
  readonly name: string;
  readonly capacity: number;
  readonly _dense: true;
  /** Entity ID `->` index in the data array */
  readonly entityToIndex: Map<EntityId, number>;
  /** Index `->` Entity ID (for iteration) */
  readonly indexToEntity: EntityId[];
  /** The raw Float64Array backing store */
  readonly data: Float64Array;
  /** Current number of live entries */
  count: number;

  get(entityId: EntityId): number | undefined;
  set(entityId: EntityId, value: number): void;
  has(entityId: EntityId): boolean;
  delete(entityId: EntityId): boolean;
  reset(): void;
  /** Direct typed array view for tight-loop iteration (length = count) */
  view(): Float64Array;
  /** All entity IDs with values, in dense order */
  entities(): readonly EntityId[];
}

function _makeDenseStore(name: string, capacity: number): DenseStore {
  const entityToIndex = new Map<EntityId, number>();
  const indexToEntity: EntityId[] = [];
  const data = new Float64Array(capacity);
  data.fill(DENSE_SENTINEL);

  const store: DenseStore = {
    name,
    capacity,
    _dense: true,
    entityToIndex,
    indexToEntity,
    data,
    count: 0,

    get(entityId: EntityId): number | undefined {
      const idx = entityToIndex.get(entityId);
      if (idx === undefined) return undefined;
      return data[idx];
    },

    set(entityId: EntityId, value: number): void {
      let idx = entityToIndex.get(entityId);
      if (idx !== undefined) {
        data[idx] = value;
        return;
      }
      if (store.count >= capacity) {
        throw ValidationError(
          'createDenseStore',
          `store "${name}" at capacity (${capacity}). Cannot add entity ${entityId}. ` +
            'Create the store with a larger capacity (createDenseStore(name, n)) or remove entities before adding.',
        );
      }
      idx = store.count;
      entityToIndex.set(entityId, idx);
      indexToEntity[idx] = entityId;
      data[idx] = value;
      store.count++;
    },

    has(entityId: EntityId): boolean {
      return entityToIndex.has(entityId);
    },

    delete(entityId: EntityId): boolean {
      const idx = entityToIndex.get(entityId);
      if (idx === undefined) return false;

      const lastIdx = store.count - 1;
      if (idx !== lastIdx) {
        // Swap-remove: move last element into the vacated slot
        const lastEntity = indexToEntity[lastIdx]!;
        data[idx] = data[lastIdx]!;
        indexToEntity[idx] = lastEntity;
        entityToIndex.set(lastEntity, idx);
      }
      data[lastIdx] = DENSE_SENTINEL;
      indexToEntity.length = lastIdx;
      entityToIndex.delete(entityId);
      store.count--;
      return true;
    },

    reset(): void {
      entityToIndex.clear();
      indexToEntity.length = 0;
      data.fill(DENSE_SENTINEL);
      store.count = 0;
    },

    view(): Float64Array {
      return data.subarray(0, store.count);
    },

    entities(): readonly EntityId[] {
      return indexToEntity;
    },
  };

  return store;
}

// ---------------------------------------------------------------------------
// Dense System -- operates directly on Float64Array data
// ---------------------------------------------------------------------------

/** A system that operates directly over dense numeric stores. */
export interface DenseSystem {
  readonly name: string;
  readonly query: readonly string[];
  readonly _denseSystem: true;
  /**
   * Execute receives dense stores keyed by component name.
   * Systems iterate the typed arrays directly -- zero allocation per tick.
   */
  execute(stores: ReadonlyMap<string, DenseStore>): void;
}

// ---------------------------------------------------------------------------
// System types
// ---------------------------------------------------------------------------

/** A system that processes entities matching a component-name query. */
export interface System {
  readonly name: string;
  readonly query: readonly string[];
  readonly _denseSystem?: undefined;
  /** Second argument is the world — use it to write computed output components back. */
  execute(entities: readonly Entity[], world?: World): void;
}

type AnySystem = System | DenseSystem;

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

/** A live ECS world that owns entities, component stores, and ordered systems. */
export interface World {
  spawn(components?: Record<string, unknown>): EntityId;
  despawn(id: EntityId): void;
  addComponent<T>(id: EntityId, component: Part<T>, value: T): void;
  /** Schema-free component write — used by systems to persist computed output values. */
  setComponent(id: EntityId, name: string, value: unknown): void;
  removeComponent(id: EntityId, name: string): void;
  query(...componentNames: string[]): readonly Entity[];
  addSystem(system: AnySystem): void;
  tick(): void;
  /** Register a dense store so the world can wire it into dense systems */
  addDenseStore(store: DenseStore): void;
}

/**
 * A live ECS world that owns its teardown directly ({@link AsyncOwnedResource}).
 * The world registers zero finalizers (its state is plain in-memory Maps that GC
 * reclaims), so `world.dispose()` is a formal, exactly-once release handle for
 * consumers (e.g. the scene runtime) that thread world lifecycle uniformly — not
 * a carrier of any actual finalizer. The owning {@link Lifetime} stays reachable
 * as `world.lifetime` for advanced composition.
 */
type OwnedWorld = World & AsyncOwnedResource;

/**
 * Build a fresh ECS {@link World} — the entity/system container that ticks systems
 * over entities. The world IS its own disposable ({@link AsyncOwnedResource}); the
 * owning {@link Lifetime} stays reachable as `world.lifetime` for advanced
 * composition (verb grammar, ADR-0046 — `create` allocates a runtime resource).
 */
export function createWorld(): OwnedWorld {
  const entities = new Map<EntityId, Map<string, unknown>>();
  const systems: AnySystem[] = [];
  const denseStores = new Map<string, DenseStore>();
  let nextEntitySeq = 0;

  const world: World = {
    spawn(components?: Record<string, unknown>): EntityId {
      const seq = nextEntitySeq++;
      // CUT B1: route the identity suffix through the one canonical encoder
      // (CanonicalCbor sorts map keys) so it is deterministic under component
      // key permutation — `JSON.stringify` was key-order-dependent.
      const id = EntityId(`entity-${seq}:${fnv1aBytes(CanonicalCbor.encode(components ?? {}))}`);
      const componentMap = new Map<string, unknown>();
      if (components) {
        for (const [name, value] of Object.entries(components)) {
          componentMap.set(name, value);
        }
      }
      entities.set(id, componentMap);
      return id;
    },

    despawn(id: EntityId): void {
      // Remove from entity map
      entities.delete(id);
      // Remove from all dense stores
      for (const store of denseStores.values()) {
        store.delete(id);
      }
    },

    addComponent<T>(id: EntityId, component: Part<T>, value: T): void {
      const entity = entities.get(id);
      if (entity) {
        entity.set(component.name, value);
      }
    },

    setComponent(id: EntityId, name: string, value: unknown): void {
      const entity = entities.get(id);
      if (entity) {
        entity.set(name, value);
      }
    },

    removeComponent(id: EntityId, name: string): void {
      const entity = entities.get(id);
      if (entity) {
        entity.delete(name);
      }
    },

    query(...componentNames: string[]): readonly Entity[] {
      const results: Entity[] = [];

      for (const [id, components] of entities) {
        const hasAll = componentNames.every((name) => components.has(name));
        if (hasAll) {
          const componentsCopy = new Map(components) as ReadonlyMap<string, unknown>;
          // Spread component values as direct properties so systems can access
          // computed output fields (e.g. `_opacity`, `_phase`, `_blend`) directly.
          const entity = Object.assign(
            { id, components: componentsCopy },
            Object.fromEntries(componentsCopy),
          ) as Entity;
          results.push(entity);
        }
      }

      return results;
    },

    addSystem(system: AnySystem): void {
      systems.push(system);
    },

    addDenseStore(store: DenseStore): void {
      denseStores.set(store.name, store);
    },

    tick(): void {
      // THE LAW (within-tick read-current): a regular system's `setComponent`
      // write lands in the live `entities` map and the NEXT system's `query`
      // observes it the same tick — so queries are re-run per system against the
      // current state, never snapshotted at tick start (scene SVGSystem reads
      // `_opacity`/`_blend` written by Video/Transition earlier this tick).
      //
      // The SYSTEM LIST, however, IS snapshotted per tick: a system that calls
      // `world.addSystem()` from its `execute` registers for the NEXT tick, not the
      // current one — otherwise the freshly-pushed system would run mid-tick, and a
      // system that repeatedly registers another could grow the tick without bound.
      // This snapshots only WHICH systems run; the live component reads are unaffected.
      for (const system of [...systems]) {
        if (isDenseSystem(system)) {
          // Dense path: collect the stores this system queries
          const queriedStores = new Map<string, DenseStore>();
          for (const name of system.query) {
            const store = denseStores.get(name);
            if (store) queriedStores.set(name, store);
          }
          // Only execute if all queried stores exist
          if (queriedStores.size === system.query.length) {
            system.execute(queriedStores);
          }
        } else {
          // Regular path: entity-component query reads the LIVE entity map, so
          // it observes writes made by systems earlier in this same tick.
          const matched = world.query(...system.query);
          system.execute(matched, world);
        }
      }
    },
  };

  return attachLifetime(world, Lifetime.make());
}

function isDenseSystem(system: AnySystem): system is DenseSystem {
  return '_denseSystem' in system && system._denseSystem === true;
}

// ---------------------------------------------------------------------------
// ECS factories and public types
// ---------------------------------------------------------------------------

/**
 * Allocate a fixed-capacity dense numeric component store. The standalone
 * `create*` verb makes allocation explicit while preserving the same
 * `Float64Array`-backed zero-allocation hot path.
 */
export function createDenseStore(name: string, capacity: number): DenseStore {
  return _makeDenseStore(name, capacity);
}

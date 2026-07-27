/**
 * Fixed-capacity numeric Part storage and dense-system authority.
 *
 * Admission happens before values enter this hot path. Store writers therefore
 * accept trusted numbers without allocating wrappers per frame.
 *
 * @module
 */

import { InvariantViolationError, ValidationError } from '@liteship/error';
import { assertMintedPart, assertUniqueParts, type EntityId, type Part, type TuplePart } from './part.js';

const DenseSystemWitness: unique symbol = Symbol('liteship.ecs.dense-system');
const DENSE_SENTINEL = -Infinity;

/** Read-only public view of one fixed-capacity numeric component store. */
export interface DenseStore<P extends Part<number> = Part<number>> {
  readonly part: P;
  readonly name: P['name'];
  readonly capacity: number;
  readonly _dense: true;
  readonly entityToIndex: ReadonlyMap<EntityId, number>;
  readonly indexToEntity: readonly EntityId[];
  readonly count: number;
  get(entityId: EntityId): number | undefined;
  has(entityId: EntityId): boolean;
  view(): ReadonlyDenseValues;
  entities(): readonly EntityId[];
}

/** A zero-copy numeric view with no mutating typed-array methods. */
export interface ReadonlyDenseValues extends Iterable<number> {
  readonly length: number;
  at(index: number): number | undefined;
}

/** Trusted mutation capability retained by a dense-store owner or declared system. */
export interface DenseStoreWriter<P extends Part<number> = Part<number>> {
  readonly part: P;
  set(entityId: EntityId, value: number): void;
  delete(entityId: EntityId): boolean;
  reset(): void;
  /** Mutable zero-copy view, available only through declared write authority. */
  view(): Float64Array;
}

/** One dense store paired with the trusted owner capability that mutates it. */
export interface OwnedDenseStore<P extends Part<number> = Part<number>> {
  readonly store: DenseStore<P>;
  readonly writer: DenseStoreWriter<P>;
}

const mintedDenseStoreOwners = new WeakSet<object>();

function createDenseStoreOwner<P extends Part<number>>(part: P, capacity: number): OwnedDenseStore<P> {
  assertMintedPart(part);
  if (!Number.isSafeInteger(capacity) || capacity < 0) {
    throw ValidationError('createDenseStore', `capacity must be a non-negative safe integer; received ${capacity}.`);
  }
  const entityToIndex = new Map<EntityId, number>();
  const indexToEntity: EntityId[] = [];
  const data = new Float64Array(capacity);
  data.fill(DENSE_SENTINEL);
  let count = 0;

  const readonlyValues: ReadonlyDenseValues = Object.freeze({
    get length() {
      return count;
    },
    at(index: number) {
      const normalized = index < 0 ? count + index : index;
      return normalized >= 0 && normalized < count ? data[normalized] : undefined;
    },
    *[Symbol.iterator]() {
      for (let index = 0; index < count; index++) yield data[index]!;
    },
  });

  const store: DenseStore<P> = {
    part,
    name: part.name,
    capacity,
    _dense: true,
    entityToIndex,
    indexToEntity,
    get count() {
      return count;
    },
    get(entityId) {
      const index = entityToIndex.get(entityId);
      return index === undefined ? undefined : data[index];
    },
    has(entityId) {
      return entityToIndex.has(entityId);
    },
    view() {
      return readonlyValues;
    },
    entities() {
      return indexToEntity;
    },
  };

  const writer: DenseStoreWriter<P> = {
    part,
    set(entityId, value) {
      let index = entityToIndex.get(entityId);
      if (index !== undefined) {
        data[index] = value;
        return;
      }
      if (count >= capacity) {
        throw ValidationError(
          'createDenseStore',
          `store "${part.name}" at capacity (${capacity}). Cannot add entity ${entityId}. ` +
            'Create the store with a larger capacity or remove entities before adding.',
        );
      }
      index = count;
      entityToIndex.set(entityId, index);
      indexToEntity[index] = entityId;
      data[index] = value;
      count++;
    },
    delete(entityId) {
      const index = entityToIndex.get(entityId);
      if (index === undefined) return false;
      const lastIndex = count - 1;
      if (index !== lastIndex) {
        const lastEntity = indexToEntity[lastIndex]!;
        data[index] = data[lastIndex]!;
        indexToEntity[index] = lastEntity;
        entityToIndex.set(lastEntity, index);
      }
      data[lastIndex] = DENSE_SENTINEL;
      indexToEntity.length = lastIndex;
      entityToIndex.delete(entityId);
      count--;
      return true;
    },
    reset() {
      entityToIndex.clear();
      indexToEntity.length = 0;
      data.fill(DENSE_SENTINEL);
      count = 0;
    },
    view() {
      return data.subarray(0, count);
    },
  };
  Object.freeze(store);
  Object.freeze(writer);
  const owned = Object.freeze({ store, writer });
  mintedDenseStoreOwners.add(owned);
  return owned;
}

/** Allocate a Part-bound dense numeric store and its owner capability. */
export function createDenseStore<P extends Part<number>>(part: P, capacity: number): OwnedDenseStore<P> {
  return createDenseStoreOwner(part, capacity);
}

/** Context supplied to a declared dense system. */
export interface DenseSystemContext<R extends readonly Part<number>[], W extends readonly Part<number>[]> {
  read<P extends TuplePart<R>>(part: P): DenseStore<P>;
  write<P extends TuplePart<W>>(part: P): DenseStoreWriter<P>;
}

/** A declared dense system. Construct with {@link defineDenseSystem}. */
export interface DenseSystem<
  R extends readonly Part<number>[] = readonly Part<number>[],
  W extends readonly Part<number>[] = readonly Part<number>[],
> {
  readonly name: string;
  readonly reads: R;
  readonly writes: W;
  readonly _denseSystem: true;
  execute(context: DenseSystemContext<R, W>): void;
  readonly [DenseSystemWitness]: true;
}

const mintedDenseSystems = new WeakSet<object>();

/** Define a dense system with explicit read and write store capabilities. */
export function defineDenseSystem<
  const R extends readonly Part<number>[],
  const W extends readonly Part<number>[],
>(definition: {
  readonly name: string;
  readonly reads: R;
  readonly writes: W;
  readonly execute: DenseSystem<R, W>['execute'];
}): DenseSystem<R, W> {
  assertUniqueParts('defineDenseSystem.reads', definition.reads);
  assertUniqueParts('defineDenseSystem.writes', definition.writes);
  const system: DenseSystem<R, W> = {
    name: definition.name,
    reads: Object.freeze([...definition.reads]) as unknown as R,
    writes: Object.freeze([...definition.writes]) as unknown as W,
    _denseSystem: true,
    execute: definition.execute,
    [DenseSystemWitness]: true,
  };
  Object.freeze(system);
  mintedDenseSystems.add(system);
  return system;
}

/** @internal Whether a dense system crossed the canonical constructor. */
export function isDenseSystem(system: SystemLike): system is DenseSystem {
  return mintedDenseSystems.has(system);
}

/** @internal Refuse forged store/writer capability pairs. */
export function assertDenseStoreOwner(owned: OwnedDenseStore): void {
  if (!mintedDenseStoreOwners.has(owned)) {
    throw InvariantViolationError(
      'ecs.dense-store',
      'dense store owner was not minted by createDenseStore; refusing a forged store/writer pair.',
    );
  }
}

/** @internal Minimal erased shape accepted by the dense-system witness census. */
type SystemLike = object;

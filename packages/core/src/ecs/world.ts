/**
 * ECS world composition, regular systems, and trusted execution contexts.
 *
 * The world composes admitted Part values with sparse and dense execution. It
 * owns scheduling and authority checks; Part validation and dense storage stay
 * with their respective semantic owners.
 *
 * @module
 */

import { InvariantViolationError, ValidationError } from '@liteship/error';
import { fnv1aBytes } from '../evidence/fnv.js';
import { Lifetime, attachLifetime } from '../reactive/lifetime.js';
import type { AsyncOwnedResource } from '../reactive/lifetime.js';
import { CanonicalCbor } from '../schema/cbor.js';
import {
  assertDenseStoreOwner,
  isDenseSystem,
  type DenseStore,
  type DenseStoreWriter,
  type DenseSystem,
  type DenseSystemContext,
  type OwnedDenseStore,
} from './dense.js';
import {
  EntityId,
  assertAdmission,
  assertMintedPart,
  assertUniqueParts,
  type AdmittedPartValue,
  type AnyPart,
  type Part,
  type PartTuple,
  type PartValue,
  type ReadablePart,
  type TuplePart,
} from './part.js';

const SystemWitness: unique symbol = Symbol('liteship.ecs.system');

/** Immutable snapshot view of one entity. */
export interface Entity<P extends AnyPart = AnyPart> {
  readonly id: EntityId;
  /** Read a Part known to be present in this view. */
  get<Q extends P>(part: Q): PartValue<Q>;
}

/** The intentionally minimal entity handle supplied to a system. */
export interface SystemEntity {
  readonly id: EntityId;
}

/** Trusted context supplied to one declared regular system. */
export interface SystemContext<
  Q extends PartTuple = PartTuple,
  R extends PartTuple = PartTuple,
  W extends PartTuple = PartTuple,
> {
  read<P extends TuplePart<Q>>(entity: SystemEntity, part: P): PartValue<P>;
  optional<P extends ReadablePart<Q, R>>(entity: SystemEntity, part: P): PartValue<P> | undefined;
  query<const P extends readonly ReadablePart<Q, R>[]>(...parts: P): readonly Entity<TuplePart<P>>[];
  write<P extends TuplePart<W>>(entity: SystemEntity, part: P, value: PartValue<P>): void;
}

/** One typed regular ECS system. Construct with {@link defineSystem}. */
export interface System<
  Q extends PartTuple = PartTuple,
  R extends PartTuple = PartTuple,
  W extends PartTuple = PartTuple,
> {
  readonly name: string;
  readonly query: Q;
  readonly reads: R;
  readonly writes: W;
  execute(entities: readonly SystemEntity[], context: SystemContext<Q, R, W>): void;
  readonly [SystemWitness]: true;
}

/** Input accepted by {@link defineSystem}. */
export interface SystemDefinition<Q extends PartTuple, R extends PartTuple, W extends PartTuple> {
  readonly name: string;
  readonly query: Q;
  readonly reads: R;
  readonly writes: W;
  readonly execute: System<Q, R, W>['execute'];
}

const mintedSystems = new WeakSet<object>();

/** Define a system whose read/write authority is explicit and runtime-enforced. */
export function defineSystem<const Q extends PartTuple, const R extends PartTuple, const W extends PartTuple>(
  definition: SystemDefinition<Q, R, W>,
): System<Q, R, W> {
  assertUniqueParts('defineSystem.query', definition.query);
  assertUniqueParts('defineSystem.reads', definition.reads);
  assertUniqueParts('defineSystem.writes', definition.writes);
  const querySet = new Set<AnyPart>(definition.query);
  for (const part of definition.reads) {
    if (querySet.has(part)) {
      throw ValidationError(
        'defineSystem.reads',
        `Part "${part.name}" is already required by query; do not also declare it as an optional read.`,
      );
    }
  }
  const system: System<Q, R, W> = {
    name: definition.name,
    query: Object.freeze([...definition.query]) as unknown as Q,
    reads: Object.freeze([...definition.reads]) as unknown as R,
    writes: Object.freeze([...definition.writes]) as unknown as W,
    execute: definition.execute,
    [SystemWitness]: true,
  };
  Object.freeze(system);
  mintedSystems.add(system);
  return system;
}

type AnySystem = System | DenseSystem;

type ScheduledSystem =
  | { readonly kind: 'regular'; readonly system: System; readonly context: SystemContext }
  | {
      readonly kind: 'dense';
      readonly system: DenseSystem;
      readonly context: DenseSystemContext<readonly Part<number>[], readonly Part<number>[]>;
    };

/** A live ECS world with typed component and system boundaries. */
export interface World {
  spawn(...values: readonly AdmittedPartValue[]): EntityId;
  despawn(id: EntityId): void;
  set<P extends AnyPart>(id: EntityId, value: AdmittedPartValue<P>): void;
  remove(id: EntityId, part: AnyPart): void;
  query<const P extends PartTuple>(...parts: P): readonly Entity<TuplePart<P>>[];
  addSystem(system: AnySystem): void;
  addDenseStore<P extends Part<number>>(owned: OwnedDenseStore<P>): void;
  tick(): void;
}

type OwnedWorld = World & AsyncOwnedResource;

interface DenseEntry {
  readonly store: DenseStore<Part<number>>;
  readonly writer: DenseStoreWriter<Part<number>>;
}

/** Build a fresh typed ECS world. */
export function createWorld(): OwnedWorld {
  const entities = new Map<EntityId, Map<AnyPart, unknown>>();
  const systems: ScheduledSystem[] = [];
  const denseStores = new Map<Part<number>, DenseEntry>();
  const partsByName = new Map<string, AnyPart>();
  let nextEntitySeq = 0;

  const registerPart = (part: AnyPart): void => {
    assertMintedPart(part);
    const existing = partsByName.get(part.name);
    if (existing !== undefined && existing !== part) {
      throw InvariantViolationError(
        'ecs.part-name',
        `two distinct Parts claim component name "${part.name}"; import the canonical owner declaration instead of redefining it.`,
      );
    }
    partsByName.set(part.name, part);
  };

  const makeView = <P extends AnyPart>(id: EntityId, live: Map<AnyPart, unknown>): Entity<P> => {
    const snapshot = new Map(live);
    const view: Entity<P> = {
      id,
      get<Q extends P>(part: Q): PartValue<Q> {
        if (!snapshot.has(part)) {
          throw InvariantViolationError('ecs.entity-read', `entity ${id} does not carry Part "${part.name}".`);
        }
        return snapshot.get(part) as PartValue<Q>;
      },
    };
    return Object.freeze(view);
  };

  const queryParts = <P extends PartTuple>(parts: P): readonly Entity<TuplePart<P>>[] => {
    for (const part of parts) registerPart(part);
    const results: Entity<TuplePart<P>>[] = [];
    for (const [id, components] of entities) {
      if (parts.every((part) => components.has(part))) results.push(makeView<TuplePart<P>>(id, components));
    }
    return Object.freeze(results);
  };

  const trustedWrite = (id: EntityId, part: AnyPart, value: unknown): void => {
    registerPart(part);
    entities.get(id)?.set(part, value);
  };

  const readLive = (id: EntityId, part: AnyPart): unknown => entities.get(id)?.get(part);

  const scheduleSystem = (system: AnySystem): ScheduledSystem => {
    if (isDenseSystem(system)) {
      const readSet = new Set<AnyPart>(system.reads);
      const writeSet = new Set<AnyPart>(system.writes);
      const context: DenseSystemContext<readonly Part<number>[], readonly Part<number>[]> = {
        read(part) {
          if (!readSet.has(part)) {
            throw InvariantViolationError(
              'ecs.dense-read-authority',
              `dense system "${system.name}" attempted undeclared read of Part "${part.name}".`,
            );
          }
          return denseStores.get(part)!.store as DenseStore<typeof part>;
        },
        write(part) {
          if (!writeSet.has(part)) {
            throw InvariantViolationError(
              'ecs.dense-write-authority',
              `dense system "${system.name}" attempted undeclared write of Part "${part.name}".`,
            );
          }
          return denseStores.get(part)!.writer as DenseStoreWriter<typeof part>;
        },
      };
      return Object.freeze({ kind: 'dense', system, context });
    }

    const required = new Set<AnyPart>(system.query);
    const readable = new Set<AnyPart>([...system.query, ...system.reads]);
    const writable = new Set<AnyPart>(system.writes);
    const context: SystemContext = {
      read(entity, part) {
        if (!required.has(part)) {
          throw InvariantViolationError(
            'ecs.read-authority',
            `system "${system.name}" attempted required read of undeclared Part "${part.name}".`,
          );
        }
        return readLive(entity.id, part) as PartValue<typeof part>;
      },
      optional(entity, part) {
        if (!readable.has(part)) {
          throw InvariantViolationError(
            'ecs.read-authority',
            `system "${system.name}" attempted undeclared optional read of Part "${part.name}".`,
          );
        }
        return readLive(entity.id, part) as PartValue<typeof part> | undefined;
      },
      query(...parts) {
        for (const part of parts) {
          if (!readable.has(part)) {
            throw InvariantViolationError(
              'ecs.read-authority',
              `system "${system.name}" attempted undeclared secondary query of Part "${part.name}".`,
            );
          }
        }
        return queryParts(parts);
      },
      write(entity, part, value) {
        if (!writable.has(part)) {
          throw InvariantViolationError(
            'ecs.write-authority',
            `system "${system.name}" attempted undeclared write of Part "${part.name}".`,
          );
        }
        trustedWrite(entity.id, part, value);
      },
    };
    return Object.freeze({ kind: 'regular', system, context });
  };

  const world: World = {
    spawn(...values) {
      const components = new Map<AnyPart, unknown>();
      for (const admitted of values) {
        assertAdmission(admitted);
        registerPart(admitted.part);
        if (components.has(admitted.part)) {
          throw ValidationError('World.spawn', `Part "${admitted.part.name}" was supplied more than once.`);
        }
        components.set(admitted.part, admitted.value);
      }
      const canonical = Object.fromEntries(
        [...components]
          .map(([part, value]) => [part.name, value] as const)
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
      );
      const sequence = nextEntitySeq++;
      const id = EntityId(`entity-${sequence}:${fnv1aBytes(CanonicalCbor.encode(canonical))}`);
      entities.set(id, components);
      return id;
    },
    despawn(id) {
      entities.delete(id);
      for (const dense of denseStores.values()) dense.writer.delete(id);
    },
    set(id, admitted) {
      assertAdmission(admitted);
      trustedWrite(id, admitted.part, admitted.value);
    },
    remove(id, part) {
      registerPart(part);
      entities.get(id)?.delete(part);
    },
    query(...parts) {
      return queryParts(parts);
    },
    addSystem(system) {
      const regular = mintedSystems.has(system);
      const dense = isDenseSystem(system);
      if (!regular && !dense) {
        throw InvariantViolationError('ecs.system', 'system was not minted by defineSystem/defineDenseSystem.');
      }
      systems.push(scheduleSystem(system));
    },
    addDenseStore(owned) {
      assertDenseStoreOwner(owned);
      registerPart(owned.store.part);
      const part = owned.store.part;
      const existing = denseStores.get(part);
      if (existing !== undefined && existing.store !== owned.store) {
        throw InvariantViolationError('ecs.dense-store', `Part "${part.name}" already has a registered dense store.`);
      }
      denseStores.set(part, owned as DenseEntry);
    },
    tick() {
      for (const scheduled of [...systems]) {
        if (scheduled.kind === 'dense') {
          const { system, context } = scheduled;
          const required = [...system.reads, ...system.writes];
          if (!required.every((part) => denseStores.has(part))) continue;
          system.execute(context);
          continue;
        }
        const { system, context } = scheduled;
        const matched = queryParts(system.query);
        system.execute(
          matched.map(({ id }) => Object.freeze({ id })),
          context,
        );
      }
    },
  };

  return attachLifetime(world, Lifetime.make());
}

/**
 * Composable -- ECS Composition over Existing Primitives
 *
 * Universal composition API leveraging existing deterministic primitives.
 * Zero boilerplate, type-safe, content-addressed entity composition.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import type { Token } from './token.js';
import type { Style } from './style.js';
import type { World } from '../ecs/index.js';
import type { AdmittedPartValue, DenseStore, DenseStoreWriter, EntityId, Part } from '../ecs/index.js';
import { Token as TokenNS } from './token.js';
import { Style as StyleNS } from './style.js';
import { Boundary } from './boundary.js';
import { admitPart, createDenseStore, definePart } from '../ecs/index.js';
import { contentAddressOf } from '../evidence/content-address.js';
import { ValidationError } from '@liteship/error';
import { schema } from '../schema/constructors.js';

// ---------------------------------------------------------------------------
// Entity Composition Types
// ---------------------------------------------------------------------------

/**
 * Component map for a {@link ComposableEntity} — well-known slots for liteship
 * primitives plus arbitrary user-defined keys.
 */
export interface EntityComponents {
  readonly boundary?: Boundary;
  readonly token?: Token;
  readonly style?: Style;
  readonly [key: string]: unknown;
}

/**
 * Content-addressed entity: the identity is an FNV-1a hash over its components,
 * so two entities with structurally equal components share the same `id`.
 */
export interface ComposableEntity<T extends EntityComponents = EntityComponents> {
  readonly id: ContentAddress;
  readonly components: T;
  readonly _tag: 'ComposableEntity';
}

const ComposableComponentsPart = definePart('composable-components', schema.record(schema.unknown));
const composableAdmissions = new WeakMap<object, AdmittedPartValue<typeof ComposableComponentsPart>>();

function admitComposableComponents(components: EntityComponents): AdmittedPartValue<typeof ComposableComponentsPart> {
  const admission = admitPart(ComposableComponentsPart, components);
  if (!admission.ok) {
    throw ValidationError(
      'ComposableWorld.spawn',
      `components failed ECS admission: ${admission.error.map((issue) => issue.message).join('; ')}`,
    );
  }
  return admission.value;
}

function admissionFor(entity: ComposableEntity): AdmittedPartValue<typeof ComposableComponentsPart> {
  return composableAdmissions.get(entity) ?? admitComposableComponents(entity.components);
}

// ---------------------------------------------------------------------------
// Composable Factory
// ---------------------------------------------------------------------------

interface ComposableFactory {
  compose<T extends EntityComponents>(entity1: ComposableEntity<T>, entity2: ComposableEntity<T>): ComposableEntity<T>;
  merge<T extends EntityComponents>(...entities: ComposableEntity<T>[]): ComposableEntity<T>;
}

function makeEntityId(components: EntityComponents): ContentAddress {
  // Identity routes through the one shared content-addressing kernel
  // (canonicalize → CanonicalCbor → fnv1a, CUT B1) so EntityId, BoundaryDef.id,
  // and DocumentGraph ids cannot diverge.
  return contentAddressOf(components);
}

/**
 * Content-address a component bag into a {@link ComposableEntity}. Two entities
 * with structurally-equal components share the same content address (verb grammar,
 * ADR-0046 — `create` allocates a content-addressed unit).
 */
export function createComposable<T extends EntityComponents>(components: T): ComposableEntity<T> {
  const admission = admitComposableComponents(components);
  const ownedComponents = admission.value as T;
  const id = makeEntityId(ownedComponents);
  const entity = Object.freeze({
    id,
    components: ownedComponents,
    _tag: 'ComposableEntity',
  } as const);
  composableAdmissions.set(entity, admission);
  return entity;
}

function _compose<T extends EntityComponents>(
  entity1: ComposableEntity<T>,
  entity2: ComposableEntity<T>,
): ComposableEntity<T> {
  // Merge components with entity2 taking precedence
  const merged = { ...entity1.components, ...entity2.components };
  return createComposable(merged);
}

function _merge<T extends EntityComponents>(...entities: ComposableEntity<T>[]): ComposableEntity<T> {
  if (entities.length === 0) {
    throw ValidationError(
      'Composable.merge',
      'called with no entities — pass at least one ComposableEntity, e.g. Composable.merge(a, b).',
    );
  }
  const first = entities[0];
  if (!first) {
    throw ValidationError(
      'Composable.merge',
      'entities[0] is undefined — you likely passed a sparse or filtered array. ' +
        'Filter out undefined before merging: Composable.merge(...entities.filter(Boolean)).',
    );
  }
  return entities.slice(1).reduce((acc, entity) => _compose(acc, entity), first);
}

// ---------------------------------------------------------------------------
// ECS Integration
// ---------------------------------------------------------------------------

interface TypedComposableWorld<Schema extends EntityComponents = EntityComponents> {
  spawn<T extends Schema>(components: T): ComposableEntity<T>;
  spawnWith<T extends Schema>(entity: ComposableEntity<T>): ComposableEntity<T>;
  query<K extends keyof Schema>(...componentTypes: K[]): readonly ComposableEntity<Pick<Schema, K>>[];
  evaluate<T extends Schema>(entity: ComposableEntity<T>, input: Record<string, number>): Record<string, string>;
}

function makeComposableWorld<Schema extends EntityComponents = EntityComponents>(
  world: World,
): TypedComposableWorld<Schema> {
  // Mapping from ContentAddress to ECS EntityId for query reconstruction
  const addressToEntityId = new Map<ContentAddress, EntityId>();

  return {
    spawn<T extends Schema>(components: T): ComposableEntity<T> {
      const entity = createComposable(components);
      const ecsId = world.spawn(admissionFor(entity));
      addressToEntityId.set(entity.id, ecsId);
      return entity;
    },

    spawnWith<T extends Schema>(entity: ComposableEntity<T>): ComposableEntity<T> {
      const ecsId = world.spawn(admissionFor(entity));
      addressToEntityId.set(entity.id, ecsId);
      return entity;
    },

    query<K extends keyof Schema>(...componentTypes: K[]): readonly ComposableEntity<Pick<Schema, K>>[] {
      const names = [...componentTypes].map((key) => String(key)).sort();
      const entities = world.query(ComposableComponentsPart);
      return [...entities]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((entityShape) => entityShape.get(ComposableComponentsPart))
        .filter((components) => names.every((name) => Object.hasOwn(components, name)))
        .map((components) => {
          const picked = Object.fromEntries(names.map((name) => [name, components[name]])) as Pick<Schema, K>;
          return createComposable(picked);
        });
    },

    evaluate<T extends Schema>(entity: ComposableEntity<T>, input: Record<string, number>): Record<string, string> {
      const results: Record<string, string> = {};

      // Evaluate boundary component: quantize continuous input to discrete state
      let boundaryState: string | undefined;
      if (entity.components.boundary) {
        const boundary = entity.components.boundary;
        const boundaryInput = input[boundary.input] ?? 0;
        const state = Boundary.evaluate(boundary, boundaryInput);
        results[boundary.input] = state;
        boundaryState = state;
      }

      // Evaluate token component: resolve axis values or fall back
      if (entity.components.token) {
        const token = entity.components.token;
        // Build axis values from input keys. Token.tap expects string axis values,
        // so we convert matching numeric inputs to strings.
        const axisValues: Record<string, string> = {};
        for (const axis of token.axes) {
          if (axis in input) {
            axisValues[axis] = String(input[axis]);
          }
        }
        // Use Token.tap for proper axis-key lookup with fallback
        const resolved = TokenNS.tap(token, axisValues);
        results[token.name] = String(resolved);
      }

      // Evaluate style component: resolve properties for the current boundary state
      if (entity.components.style) {
        const style = entity.components.style;
        const resolvedProps = StyleNS.tap(style, boundaryState);
        for (const [prop, val] of Object.entries(resolvedProps)) {
          results[prop] = val;
        }
      }

      return results;
    },
  };
}

// ---------------------------------------------------------------------------
// Dense Store Integration
// ---------------------------------------------------------------------------

interface ComposableDenseStore {
  create(name: string, capacity: number): DenseStore;
  store<T extends EntityComponents>(entity: ComposableEntity<T>, value: number): void;
  retrieve<T extends EntityComponents>(entity: ComposableEntity<T>): number | undefined;
}

function makeComposableDenseStore(world: World): ComposableDenseStore {
  // Maintain a mapping from ContentAddress to ECS EntityId for dense store ops
  const addressToEntityId = new Map<ContentAddress, EntityId>();
  let denseStore: DenseStore | undefined;
  let denseWriter: DenseStoreWriter | undefined;

  return {
    create(name: string, capacity: number): DenseStore {
      const part: Part<number> = definePart(name, schema.number);
      const owned = createDenseStore(part, capacity);
      world.addDenseStore(owned);
      denseStore = owned.store;
      denseWriter = owned.writer;
      return owned.store;
    },

    store<T extends EntityComponents>(entity: ComposableEntity<T>, value: number): void {
      if (!denseStore || !denseWriter) {
        throw ValidationError(
          'ComposableWorld.store',
          'no dense store exists — call world.create(name, capacity) before world.store(entity, value).',
        );
      }
      // Ensure we have an ECS EntityId for this composable entity
      let ecsId = addressToEntityId.get(entity.id);
      if (!ecsId) {
        // Spawn into the world to get an EntityId, then track mapping
        ecsId = world.spawn(admissionFor(entity));
        addressToEntityId.set(entity.id, ecsId);
      }
      denseWriter.set(ecsId, value);
    },

    retrieve<T extends EntityComponents>(entity: ComposableEntity<T>): number | undefined {
      if (!denseStore) {
        return undefined;
      }
      const ecsId = addressToEntityId.get(entity.id);
      if (!ecsId) {
        return undefined;
      }
      return denseStore.get(ecsId);
    },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Composable — content-addressed entity algebra over liteship primitives.
 *
 * Build entities from a bag of components with the standalone {@link createComposable}
 * (verb grammar, ADR-0046), then merge them associatively via `Composable.compose` /
 * `Composable.merge`, relying on the content address to deduplicate
 * structurally-equal entities.
 */
export const Composable: ComposableFactory = {
  /** Pairwise merge — right-biased; produces a new entity with a fresh content address. */
  compose: _compose,
  /** Variadic `Composable.compose`. Throws if called with zero entities. */
  merge: _merge,
};

/**
 * Bridge between a raw ECS `World` from `@liteship/core/ecs` and typed {@link ComposableEntity}
 * operations (`spawn`, `query`, `evaluate`) plus a thin dense-store integration.
 */
// OBLIGATION: OBL-REACTIVE-SWEEP-3
export const ComposableWorld = {
  /** Wrap an `@liteship/core/ecs` `World` with the typed composable-entity API. */
  make: makeComposableWorld,
  /** Build a dense-store bridge over an `@liteship/core/ecs` `World` for per-entity numeric data. */
  dense: makeComposableDenseStore,
};

/** Public structural type for `ComposableWorld`. */
export type ComposableWorld<Schema extends EntityComponents = EntityComponents> = TypedComposableWorld<Schema>;

// Type exports -- keep legacy alias for backward compatibility

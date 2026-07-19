/**
 * ECS Composable Infrastructure Tests
 *
 * Type-driven tests for ECS composition over existing primitives.
 * Tests first, implementation second - red-green methodology.
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Composable, ComposableWorld, Part, S, Style, Token, World } from '@czap/core';
import { hasTag } from '@czap/error';

const boundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ],
});

const token = Token.make({
  name: 'primary',
  category: 'color',
  axes: ['themeLevel'] as const,
  values: {
    '1': '#00e5ff',
    '2': '#ff6b6b',
  },
  fallback: '#00e5ff',
});

type TestSchema = {
  boundary?: typeof boundary;
  token?: typeof token;
  style?: typeof style;
};

const style = Style.make({
  boundary,
  base: {
    properties: {
      display: 'grid',
      padding: '1rem',
    },
  },
  states: {
    tablet: {
      properties: {
        padding: '2rem',
      },
    },
    desktop: {
      properties: {
        padding: '3rem',
      },
    },
  },
});

const scorePart = {
  name: 'score',
  schema: S.number,
};

describe('ECS Composable Infrastructure', () => {
  test('World.make returns a world with the required methods', () => {
    const { world } = World.make();

    expect(world.spawn).toBeTypeOf('function');
    expect(world.despawn).toBeTypeOf('function');
    expect(world.addComponent).toBeTypeOf('function');
    expect(world.removeComponent).toBeTypeOf('function');
    expect(world.query).toBeTypeOf('function');
    expect(world.addSystem).toBeTypeOf('function');
    expect(world.tick).toBeTypeOf('function');
    expect(world.addDenseStore).toBeTypeOf('function');
  });

  test('World.spawn returns unique EntityIds with a content fingerprint suffix', () => {
    const { world } = World.make();
    const id1 = world.spawn({ type: 'enemy' });
    const id2 = world.spawn({ type: 'enemy' });

    expect(id1).toMatch(/^entity-\d+:fnv1a:[0-9a-f]{8}$/);
    expect(id2).toMatch(/^entity-\d+:fnv1a:[0-9a-f]{8}$/);
    expect(id1).not.toBe(id2);
    // Same components must produce the same content fingerprint (fnv1a:XXXXXXXX)
    expect(id1.substring(id1.indexOf(':') + 1)).toBe(id2.substring(id2.indexOf(':') + 1));
  });

  test('World query, addComponent, removeComponent, and despawn all behave correctly', () => {
    const { world } = World.make();
    const entityId = world.spawn({ tag: 'player' });
    const missingId = 'entity-999:fnv1a:deadbeef' as never;

    world.addComponent(entityId, scorePart, 42);
    world.addComponent(missingId, scorePart, 1);

    const withScore = world.query('tag', 'score');
    world.removeComponent(entityId, 'score');
    world.removeComponent(missingId, 'score');
    const afterRemoval = world.query('tag', 'score');
    world.despawn(entityId);
    world.despawn(missingId);
    const afterDespawn = world.query('tag');

    const result = {
      withScore,
      afterRemoval,
      afterDespawn,
    };

    expect(result.withScore).toHaveLength(1);
    expect(result.withScore[0]?.components.get('score')).toBe(42);
    expect(result.afterRemoval).toHaveLength(0);
    expect(result.afterDespawn).toHaveLength(0);
  });

  test('regular systems execute during tick with matched query results', () => {
    const { world } = World.make();
    world.spawn({ position: { x: 1, y: 2 } });
    world.spawn({ position: { x: 3, y: 4 } });

    let callCount = 0;
    let lastMatched = 0;

    world.addSystem({
      name: 'position-reader',
      query: ['position'],
      execute(entities) {
        callCount++;
        lastMatched = entities.length;
      },
    });

    world.tick();
    const executions = { callCount, lastMatched };

    expect(executions.callCount).toBe(1);
    expect(executions.lastMatched).toBe(2);
  });

  test('a system that calls addSystem() during execute registers for the NEXT tick, not the current one', () => {
    const { world } = World.make();
    world.spawn({ position: { x: 1, y: 2 } });

    const runs: string[] = [];
    let registered = false;

    world.addSystem({
      name: 'spawner',
      query: ['position'],
      execute() {
        runs.push('spawner');
        // Register a second system mid-tick. It must NOT run in this same tick:
        // the tick iterates a SNAPSHOT of the system list taken at tick start,
        // otherwise the freshly-pushed system runs immediately and a system that
        // keeps registering another could grow a single tick without bound.
        if (!registered) {
          registered = true;
          world.addSystem({
            name: 'late',
            query: ['position'],
            execute() {
              runs.push('late');
            },
          });
        }
      },
    });

    world.tick();
    // First tick: only the pre-registered system ran; the mid-tick registration is deferred.
    expect(runs).toEqual(['spawner']);

    world.tick();
    // Second tick: both run — the deferred registration is now live.
    expect(runs).toEqual(['spawner', 'spawner', 'late']);
  });

  test('dense systems execute only when all queried stores are registered', () => {
    const { world } = World.make();
    const posX = Part.dense('posX', 8);
    const posY = Part.dense('posY', 8);
    const id = world.spawn();
    posX.set(id, 1);
    posY.set(id, 2);

    let executedWithMissingStore = false;
    let executedWithAllStores = false;

    world.addSystem({
      name: 'dense-mover',
      query: ['posX', 'posY'],
      _denseSystem: true,
      execute(stores) {
        executedWithMissingStore = stores.size < 2;
        executedWithAllStores = stores.size === 2;
        const xStore = stores.get('posX');
        const yStore = stores.get('posY');
        if (xStore && yStore) {
          xStore.data[0] = xStore.data[0]! + 1;
          yStore.data[0] = yStore.data[0]! + 1;
        }
      },
    });

    world.addDenseStore(posX);
    world.tick();
    const afterMissingTick = posX.get(id);
    world.addDenseStore(posY);
    world.tick();

    const result = {
      executedWithMissingStore,
      executedWithAllStores,
      afterMissingTick,
      x: posX.get(id),
      y: posY.get(id),
    };

    expect(result.executedWithMissingStore).toBe(false);
    expect(result.executedWithAllStores).toBe(true);
    expect(result.afterMissingTick).toBe(1);
    expect(result.x).toBe(2);
    expect(result.y).toBe(3);
  });

  test('Part.dense supports set/get/overwrite/delete/reset/view/entities and capacity checks', () => {
    const store = Part.dense('hp', 3);
    const idA = 'entity-1:fnv1a:aaaaaaaa' as never;
    const idB = 'entity-2:fnv1a:bbbbbbbb' as never;
    const idC = 'entity-3:fnv1a:cccccccc' as never;
    const idD = 'entity-4:fnv1a:dddddddd' as never;

    expect(store.view()).toHaveLength(0);
    expect(store.entities()).toEqual([]);
    expect(store.has(idA)).toBe(false);
    expect(store.get(idA)).toBeUndefined();

    store.set(idA, 10);
    store.set(idB, 20);
    store.set(idC, 30);
    store.set(idB, 25);

    expect(store.count).toBe(3);
    expect(store.get(idA)).toBe(10);
    expect(store.get(idB)).toBe(25);
    expect(store.get(idC)).toBe(30);
    expect(Array.from(store.view())).toEqual([10, 25, 30]);
    expect(store.entities()).toEqual([idA, idB, idC]);

    try {
      store.set(idD, 40);
      expect.unreachable('expected set to throw at capacity');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
    expect(store.delete(idB)).toBe(true);
    expect(store.count).toBe(2);
    expect(store.get(idB)).toBeUndefined();
    expect(store.get(idC)).toBe(30);
    expect(Array.from(store.view())).toEqual([10, 30]);
    expect(store.entities()).toEqual([idA, idC]);
    expect(store.delete(idD)).toBe(false);

    // Single-element deletion (no swap needed when idx === lastIdx)
    store.reset();
    store.set(idA, 77);
    expect(store.count).toBe(1);
    expect(store.delete(idA)).toBe(true);
    expect(store.count).toBe(0);
    expect(store.get(idA)).toBeUndefined();
    expect(store.view()).toHaveLength(0);

    store.reset();

    expect(store.count).toBe(0);
    expect(store.entities()).toEqual([]);
    expect(store.view()).toHaveLength(0);
  });

  test('Composable.make is deterministic and Composable.compose/merge use last-write-wins semantics', () => {
    const entityA = Composable.make<TestSchema>({ boundary, token });
    const entityACopy = Composable.make<TestSchema>({ boundary, token });
    const entityB = Composable.make<TestSchema>({ token, style });
    const composed = Composable.compose(entityA, entityB);
    const merged = Composable.merge(entityA, entityB);

    expect(entityA.id).toBe(entityACopy.id);
    expect(entityA._tag).toBe('ComposableEntity');
    expect(composed.id).toBe(merged.id);
    expect(composed.components.boundary).toBe(boundary);
    expect(composed.components.token).toBe(token);
    expect(composed.components.style).toBe(style);
    expect(() => Composable.merge()).toThrow('Composable.merge: called with no entities');
  });

  test('ComposableWorld spawn, query, and evaluate integrate Boundary, Token, and Style', () => {
    const { world } = World.make();
    const composableWorld = ComposableWorld.make(world);
    const entity = composableWorld.spawn({ boundary, token, style });
    const queried = composableWorld.query('boundary', 'token');
    const evaluation = composableWorld.evaluate(entity, {
      'viewport.width': 800,
      themeLevel: 1,
    });
    const result = { entity, queried, evaluation };

    expect(result.entity.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
    expect(result.queried).toHaveLength(1);
    expect(result.queried[0]?.components.boundary).toEqual(boundary);
    expect(result.evaluation['viewport.width']).toBe('tablet');
    expect(result.evaluation.primary).toBe('#00e5ff');
    expect(result.evaluation.padding).toBe('2rem');
    expect(result.evaluation.display).toBe('grid');
  });

  test('ComposableWorld evaluate handles empty input and entities with no known components', () => {
    const { world } = World.make();
    const composableWorld = ComposableWorld.make(world);
    const entity = Composable.make({ misc: 'value' });
    composableWorld.spawnWith(entity);
    const result = composableWorld.evaluate(entity, {});

    expect(result).toEqual({});
  });

  test('ComposableWorld.dense create/store/retrieve works and auto-spawns tracked entities', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    const entity = Composable.make({ boundary });

    const beforeCreate = dense.retrieve(entity);
    const store = dense.create('metrics', 16);
    dense.store(entity, 42);
    const afterStore = dense.retrieve(entity);

    const result = { beforeCreate, afterStore, store };

    expect(result.beforeCreate).toBeUndefined();
    expect(result.afterStore).toBe(42);
    expect(result.store.name).toBe('metrics');
    expect(result.store.count).toBe(1);
  });

  test('ComposableWorld.dense store throws if create was not called first', () => {
    expect(() => {
      const { world } = World.make();
      const dense = ComposableWorld.dense(world);
      const entity = Composable.make({ boundary });
      dense.store(entity, 1);
    }).toThrow(
      'ComposableWorld.store: no dense store exists — call world.create(name, capacity) before world.store(entity, value).',
    );
  });
});

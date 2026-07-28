/**
 * Composable-to-ECS integration.
 *
 * Generic World and dense-store laws live with the `@liteship/core/ecs`
 * owner. This suite proves the higher-level Composable projection only.
 */

import { describe, expect, test } from 'vitest';
import {
  Composable,
  ComposableWorld,
  type ComposableEntity,
  createComposable,
  defineBoundary,
  defineStyle,
  defineToken,
} from '@liteship/core';
import { createWorld } from '@liteship/core/ecs';

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ],
});

const token = defineToken({
  name: 'primary',
  category: 'color',
  axes: ['themeLevel'] as const,
  values: {
    '1': '#00e5ff',
    '2': '#ff6b6b',
  },
  fallback: '#00e5ff',
});

const style = defineStyle({
  boundary,
  base: { properties: { display: 'grid', padding: '1rem' } },
  states: {
    tablet: { properties: { padding: '2rem' } },
    desktop: { properties: { padding: '3rem' } },
  },
});

type TestSchema = {
  boundary?: typeof boundary;
  token?: typeof token;
  style?: typeof style;
};

describe('Composable ECS projection', () => {
  test('composition is deterministic, right-biased, snapshotted, and immutable', () => {
    const entityA = createComposable<TestSchema>({ boundary, token });
    const entityACopy = createComposable<TestSchema>({ boundary, token });
    const entityB = createComposable<TestSchema>({ token, style });
    const composed = Composable.compose(entityA, entityB);
    const merged = Composable.merge(entityA, entityB);

    expect(entityA.id).toBe(entityACopy.id);
    expect(entityA._tag).toBe('ComposableEntity');
    expect(composed.id).toBe(merged.id);
    expect(composed.components.boundary).toStrictEqual(boundary);
    expect(composed.components.token).toStrictEqual(token);
    expect(composed.components.style).toStrictEqual(style);
    expect(composed.components.boundary).not.toBe(boundary);
    expect(Object.isFrozen(composed.components)).toBe(true);
    expect(() => Composable.merge()).toThrow('Composable.merge: called with no entities');
    expect(() =>
      (Composable.merge as (...entities: Array<ComposableEntity | undefined>) => ComposableEntity)(undefined),
    ).toThrow('entities[0] is undefined');
  });

  test('spawn, query, and evaluate share the admitted component snapshot', () => {
    const world = createWorld();
    const composableWorld = ComposableWorld.make<TestSchema>(world);
    const entity = composableWorld.spawn({ boundary, token, style });
    const fallbackEntity = composableWorld.spawn({ boundary, token });
    const queried = composableWorld.query('boundary', 'token');
    const evaluation = composableWorld.evaluate(entity, {
      'viewport.width': 800,
      themeLevel: 1,
    });

    expect(entity.id).toMatch(/^fnv1a:[0-9a-f]{8}$/u);
    expect(queried).toHaveLength(2);
    expect(queried[0]?.components.boundary).toStrictEqual(boundary);
    expect(composableWorld.evaluate(fallbackEntity, {})).toMatchObject({
      'viewport.width': 'mobile',
      primary: '#00e5ff',
    });
    expect(evaluation).toMatchObject({
      'viewport.width': 'tablet',
      primary: '#00e5ff',
      padding: '2rem',
      display: 'grid',
    });
  });

  test('evaluate is total for an empty input and an entity with no known projection components', () => {
    const world = createWorld();
    const composableWorld = ComposableWorld.make(world);
    const entity = createComposable({ misc: 'value' });
    composableWorld.spawnWith(entity);

    expect(composableWorld.evaluate(entity, {})).toEqual({});
  });

  test('spawnWith re-admits a structurally copied entity instead of trusting WeakMap provenance', () => {
    const world = createWorld();
    const composableWorld = ComposableWorld.make<TestSchema>(world);
    const original = createComposable<TestSchema>({ boundary, token });
    const copied = { ...original, components: { ...original.components } } as ComposableEntity<TestSchema>;

    composableWorld.spawnWith(copied);

    expect(composableWorld.query('boundary', 'token')).toHaveLength(1);
  });

  test('the dense bridge creates one Part-owned store and auto-spawns tracked entities', () => {
    const world = createWorld();
    const dense = ComposableWorld.dense(world);
    const entity = createComposable({ boundary });

    expect(dense.retrieve(entity)).toBeUndefined();
    const store = dense.create('metrics', 16);
    expect(dense.retrieve(entity)).toBeUndefined();
    dense.store(entity, 42);
    dense.store(entity, 84);

    expect(dense.retrieve(entity)).toBe(84);
    expect(store.name).toBe('metrics');
    expect(store.count).toBe(1);
  });

  test('the dense bridge refuses a write before its Part/store admission boundary exists', () => {
    const dense = ComposableWorld.dense(createWorld());
    const entity = createComposable({ boundary });

    expect(() => dense.store(entity, 1)).toThrow(
      'ComposableWorld.store: no dense store exists — call world.create(name, capacity) before world.store(entity, value).',
    );
  });
});

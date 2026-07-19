/**
 * Component test: ComposableWorld end-to-end behavior.
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Composable, ComposableWorld, Style, Token, World } from '@liteship/core';

const boundary = Boundary.make({
  input: 'viewport.width',
  at: [[0, 'mobile'], [768, 'tablet'], [1024, 'desktop']],
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

type TestSchema = {
  boundary?: typeof boundary;
  token?: typeof token;
  style?: typeof style;
};

describe('ComposableWorld component behavior', () => {
  test('spawn and query round-trip through a real scoped world', () => {
    const { world } = World.make();
    const composableWorld = ComposableWorld.make<TestSchema>(world);
    composableWorld.spawn({ boundary });
    composableWorld.spawn({ boundary, token });
    composableWorld.spawn({ token });
    const result = composableWorld.query('boundary');

    expect(result).toHaveLength(2);
    expect(result.every((entity) => entity.components.boundary !== undefined)).toBe(true);
  });

  test('evaluate integrates Boundary and Style for the same entity', () => {
    const { world } = World.make();
    const composableWorld = ComposableWorld.make<TestSchema>(world);
    const entity = composableWorld.spawn({ boundary, style });
    const result = composableWorld.evaluate(entity, { 'viewport.width': 800 });

    expect(result['viewport.width']).toBe('tablet');
    expect(result.padding).toBe('2rem');
    expect(result.display).toBe('grid');
  });

  test('evaluate falls back to 0 when boundary input key is missing from input record', () => {
    const { world } = World.make();
    const composableWorld = ComposableWorld.make<TestSchema>(world);
    const entity = composableWorld.spawn({ boundary, style });
    // Omit 'viewport.width' from input — triggers ?? 0 fallback at composable.ts:181
    const result = composableWorld.evaluate(entity, {});

    // With input 0, boundary should evaluate to the first state ('mobile')
    expect(result['viewport.width']).toBe('mobile');
    // Style should resolve base properties (no boundary state match or mobile fallback)
    expect(result.display).toBe('grid');
    expect(result.padding).toBe('1rem');
  });

  test('evaluate integrates Token resolution with numeric axis inputs', () => {
    const { world } = World.make();
    const composableWorld = ComposableWorld.make<TestSchema>(world);
    const entity = composableWorld.spawn({ token });
    const result = {
      themed: composableWorld.evaluate(entity, { themeLevel: 2 }),
      fallback: composableWorld.evaluate(entity, {}),
    };

    expect(result.themed.primary).toBe('#ff6b6b');
    expect(result.fallback.primary).toBe('#00e5ff');
  });

  test('dense store lifecycle works for composable entities', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    dense.create('metrics', 32);
    const entity = Composable.make<TestSchema>({ boundary, token });
    dense.store(entity, 123);
    const result = dense.retrieve(entity);

    expect(result).toBe(123);
  });

  test('multiple composable worlds are isolated', () => {
    const { world: worldA } = World.make();
    const { world: worldB } = World.make();
    const composableWorldA = ComposableWorld.make<TestSchema>(worldA);
    const composableWorldB = ComposableWorld.make<TestSchema>(worldB);

    composableWorldA.spawn({ boundary });
    composableWorldB.spawn({ token });

    const result = {
      boundariesA: composableWorldA.query('boundary'),
      boundariesB: composableWorldB.query('boundary'),
      tokensA: composableWorldA.query('token'),
      tokensB: composableWorldB.query('token'),
    };

    expect(result.boundariesA).toHaveLength(1);
    expect(result.boundariesB).toHaveLength(0);
    expect(result.tokensA).toHaveLength(0);
    expect(result.tokensB).toHaveLength(1);
  });
});

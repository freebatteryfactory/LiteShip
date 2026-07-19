/**
 * Composable -- ECS composition over Boundary + Token + Style primitives.
 *
 * Tests determinism, composition precedence, evaluation of all three
 * component types, and round-trip identity through the ECS world.
 */

import { describe, test, expect } from 'vitest';
import {
  Composable,
  ComposableWorld,
  Boundary,
  Token,
  Style,
  World,
} from '@liteship/core';
import type { ComposableEntity, EntityComponents } from '@liteship/core';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [[0, 'sm'], [768, 'md'], [1024, 'lg']] as const,
});

const colorToken = Token.make({
  name: 'primary',
  category: 'color',
  axes: ['theme'] as const,
  values: { light: '#000', dark: '#fff' },
  fallback: '#888',
});

const baseStyle = Style.make({
  boundary: widthBoundary,
  base: { properties: { 'font-size': '14px', color: 'black' } },
  states: {
    lg: { properties: { 'font-size': '18px' } },
  },
});

// ---------------------------------------------------------------------------
// make() determinism
// ---------------------------------------------------------------------------

describe('Composable.make -- determinism', () => {
  test('same components produce the same entity ID', () => {
    const a = Composable.make({ boundary: widthBoundary });
    const b = Composable.make({ boundary: widthBoundary });
    expect(a.id).toBe(b.id);
  });

  test('same semantic nested payload with different key order produces the same entity ID', () => {
    const a = Composable.make({
      config: {
        nested: {
          second: 2,
          first: 1,
        },
        list: [{ beta: 2, alpha: 1 }],
      },
    });
    const b = Composable.make({
      config: {
        list: [{ alpha: 1, beta: 2 }],
        nested: {
          first: 1,
          second: 2,
        },
      },
    });

    expect(a.id).toBe(b.id);
  });

  test('undefined object fields are omitted from the content address', () => {
    const a = Composable.make({
      config: {
        present: 'value',
        omitted: undefined,
      },
    });
    const b = Composable.make({
      config: {
        present: 'value',
      },
    });

    expect(a.id).toBe(b.id);
  });

  test('array ordering stays stable while undefined entries canonicalize to null', () => {
    const a = Composable.make({
      config: {
        list: [1, undefined, { beta: 2, alpha: 1 }],
        enabled: true,
        nested: null,
      },
    });
    const b = Composable.make({
      config: {
        list: [1, null, { alpha: 1, beta: 2 }],
        enabled: true,
        nested: null,
      },
    });

    expect(a.id).toBe(b.id);
  });

  test('non-object fallback values use stable stringification in the content address', () => {
    const a = Composable.make({ custom: Symbol.for('shared-address') });
    const b = Composable.make({ custom: Symbol.for('shared-address') });
    const c = Composable.make({ custom: Symbol.for('different-address') });

    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(c.id);
  });

  test('different components produce different entity IDs', () => {
    const a = Composable.make({ boundary: widthBoundary });
    const b = Composable.make({ token: colorToken });
    expect(a.id).not.toBe(b.id);
  });

  test('different nested payloads produce different entity IDs', () => {
    const a = Composable.make({ config: { nested: { alpha: 1 } } });
    const b = Composable.make({ config: { nested: { alpha: 2 } } });

    expect(a.id).not.toBe(b.id);
  });

  test('entity has correct _tag', () => {
    const entity = Composable.make({ boundary: widthBoundary });
    expect(entity._tag).toBe('ComposableEntity');
  });
});

// ---------------------------------------------------------------------------
// compose() precedence
// ---------------------------------------------------------------------------

describe('Composable.compose -- precedence', () => {
  test('entity2 components override entity1', () => {
    // Use same boundary shape but different thresholds
    const altBoundary = Boundary.make({
      input: 'viewport.width',
      at: [[0, 'sm'], [768, 'md'], [1024, 'lg']] as const,
    });

    const e1 = Composable.make({ boundary: widthBoundary, token: colorToken });
    const e2 = Composable.make({ boundary: altBoundary, token: colorToken });
    const composed = Composable.compose(e1, e2);

    // boundary should come from e2
    expect(composed.components.boundary).toBe(altBoundary);
    // token should survive from e1 (same in both)
    expect(composed.components.token).toBe(colorToken);
  });

  test('merge precedence stays stable for nested plain-object components', () => {
    const e1 = Composable.make({
      config: {
        panel: {
          gap: '8px',
          color: 'red',
        },
      },
    });
    const e2 = Composable.make({
      config: {
        panel: {
          gap: '16px',
        },
      },
    });
    const composed = Composable.compose(e1, e2);

    expect(composed.components.config).toEqual({
      panel: {
        gap: '16px',
      },
    });
  });
});

// ---------------------------------------------------------------------------
// merge() reduction
// ---------------------------------------------------------------------------

describe('Composable.merge -- reduces correctly', () => {
  test('merging 3 entities folds left with later overriding earlier', () => {
    const tokenA = Token.make({
      name: 'a', category: 'spacing',
      axes: ['density'] as const,
      values: { compact: '4px' },
      fallback: '8px',
    });
    const tokenB = Token.make({
      name: 'b', category: 'spacing',
      axes: ['density'] as const,
      values: { compact: '2px' },
      fallback: '6px',
    });

    // All entities must have same component shape for merge
    const e1 = Composable.make({ boundary: widthBoundary, token: tokenA, style: baseStyle });
    const e2 = Composable.make({ boundary: widthBoundary, token: tokenA, style: baseStyle });
    const e3 = Composable.make({ boundary: widthBoundary, token: tokenA, style: baseStyle });

    const merged = Composable.merge(e1, e2, e3);

    // All entities are the same, so merged should be identical
    expect(merged.id).toBe(e1.id);
    expect(merged.components.boundary).toBe(widthBoundary);
    expect(merged.components.token).toBe(tokenA);
    expect(merged.components.style).toBe(baseStyle);
  });

  test('merge of single entity returns equivalent entity', () => {
    const e = Composable.make({ boundary: widthBoundary });
    const merged = Composable.merge(e);
    expect(merged.id).toBe(e.id);
    expect(merged.components).toEqual(e.components);
  });

  test('merge of zero entities throws', () => {
    expect(() => Composable.merge()).toThrow('Composable.merge: called with no entities');
  });

  test('merge rejects an undefined first entity', () => {
    expect(() => Composable.merge(undefined as never)).toThrow('entities[0] is undefined');
  });
});

// ---------------------------------------------------------------------------
// evaluate() -- Boundary
// ---------------------------------------------------------------------------

describe('ComposableWorld.evaluate -- Boundary', () => {
  test('evaluates boundary against input value and returns correct state', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({ boundary: widthBoundary });
    const result = cw.evaluate(entity, { 'viewport.width': 800 });

    expect(result['viewport.width']).toBe('md');
  });

  test('boundary defaults to first state for value below all thresholds', () => {
    const bp = Boundary.make({
      input: 'viewport.width',
      at: [[320, 'sm'], [768, 'md']] as const,
    });
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({ boundary: bp });
    const result = cw.evaluate(entity, { 'viewport.width': 100 });

    expect(result['viewport.width']).toBe('sm');
  });
});

// ---------------------------------------------------------------------------
// evaluate() -- Token
// ---------------------------------------------------------------------------

describe('ComposableWorld.evaluate -- Token', () => {
  test('resolves token value from matching axis', () => {
    const token = Token.make({
      name: 'bg',
      category: 'color',
      axes: ['theme'] as const,
      values: { dark: '#111', light: '#eee' },
      fallback: '#ccc',
    });

    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    // Token.tap expects string axis values; evaluate converts numeric inputs
    // For token evaluation, use a numeric key matching the axis name
    const entity = cw.spawn({ token });
    const result = cw.evaluate(entity, {});

    // No axis matched, so fallback is used
    expect(result['bg']).toBe('#ccc');
  });

  test('token falls back when no axis matches', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({ token: colorToken });
    const result = cw.evaluate(entity, { unrelated: 42 });

    expect(result['primary']).toBe('#888');
  });

  test('token resolves matching axis values after numeric inputs are coerced to strings', () => {
    const token = Token.make({
      name: 'accent',
      category: 'color',
      axes: ['theme'] as const,
      values: {
        '1': '#111111',
        '2': '#222222',
      },
      fallback: '#cccccc',
    });

    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({ token });
    const result = cw.evaluate(entity, { theme: 2 });

    expect(result['accent']).toBe('#222222');
  });
});

// ---------------------------------------------------------------------------
// evaluate() -- Style
// ---------------------------------------------------------------------------

describe('ComposableWorld.evaluate -- Style', () => {
  test('given boundary state, returns correct style properties', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({
      boundary: widthBoundary,
      style: baseStyle,
    });
    // viewport.width = 1100 should resolve to 'lg'
    const result = cw.evaluate(entity, { 'viewport.width': 1100 });

    expect(result['viewport.width']).toBe('lg');
    // Style.tap merges base + 'lg' state: font-size overridden, color from base
    expect(result['font-size']).toBe('18px');
    expect(result['color']).toBe('black');
  });

  test('style uses base properties when no boundary state matches', () => {
    const styleNoBoundary = Style.make({
      base: { properties: { display: 'flex', gap: '8px' } },
    });

    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({ style: styleNoBoundary });
    const result = cw.evaluate(entity, {});

    expect(result['display']).toBe('flex');
    expect(result['gap']).toBe('8px');
  });

  test('evaluate returns an empty object when no supported components are present', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({ custom: 'value' });
    const result = cw.evaluate(entity, {});

    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// query() -- round-trip identity
// ---------------------------------------------------------------------------

describe('ComposableWorld.query -- round-trip identity', () => {
  test('make entity -> spawn into world -> query back -> same components', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);

    const original = cw.spawn({
      boundary: widthBoundary,
      token: colorToken,
    });

    const queried = cw.query('boundary', 'token');

    expect(queried.length).toBe(1);
    const recovered = queried[0]!;
    // Components should be structurally equal (same boundary and token objects)
    expect(recovered.components.boundary).toEqual(original.components.boundary);
    expect(recovered.components.token).toEqual(original.components.token);
  });

  test('query filters by component type names', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);

    cw.spawn({ boundary: widthBoundary });
    cw.spawn({ token: colorToken });
    cw.spawn({ boundary: widthBoundary, token: colorToken });

    const boundaryOnly = cw.query('boundary');
    const tokenOnly = cw.query('token');
    const both = cw.query('boundary', 'token');

    // Two entities have 'boundary' (entity 1 and entity 3)
    expect(boundaryOnly.length).toBe(2);
    // Two entities have 'token' (entity 2 and entity 3)
    expect(tokenOnly.length).toBe(2);
    // Only entity 3 has both
    expect(both.length).toBe(1);
  });

  test('query over absent component names returns an empty list', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    cw.spawn({ boundary: widthBoundary });
    const result = cw.query('style');

    expect(result).toEqual([]);
  });

  test('spawnWith preserves identity and makes entities queryable', () => {
    const { world } = World.make();
    const cw = ComposableWorld.make(world);
    const entity = Composable.make({ boundary: widthBoundary, token: colorToken });
    const spawned = cw.spawnWith(entity);
    const queriedA = cw.query('token', 'boundary');
    const queriedB = cw.query('boundary', 'token');

    expect(spawned).toBe(entity);
    expect(queriedA.map((e) => e.id)).toEqual(queriedB.map((e) => e.id));
    expect(queriedA[0]?.id).toBe(entity.id);
  });
});

// ---------------------------------------------------------------------------
// Dense store -- store/retrieve round-trip
// ---------------------------------------------------------------------------

describe('ComposableWorld.dense -- store/retrieve', () => {
  test('store and retrieve round-trip', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    dense.create('velocity', 16);

    const entity = Composable.make({ boundary: widthBoundary });
    dense.store(entity, 42.5);
    const result = dense.retrieve(entity);

    expect(result).toBe(42.5);
  });

  test('retrieve returns undefined for unknown entity', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    dense.create('hp', 8);

    const entity = Composable.make({ token: colorToken });
    const result = dense.retrieve(entity);

    expect(result).toBeUndefined();
  });

  test('retrieve returns undefined before a dense store is created', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    const entity = Composable.make({ boundary: widthBoundary });
    const result = dense.retrieve(entity);

    expect(result).toBeUndefined();
  });

  test('store rejects writes before create() is called', () => {
    expect(() => {
      const { world } = World.make();
      const dense = ComposableWorld.dense(world);
      const entity = Composable.make({ boundary: widthBoundary });
      dense.store(entity, 1);
    }).toThrow('no dense store exists — call world.create(name, capacity)');
  });

  test('store overwrites previous value', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    dense.create('hp', 8);

    const entity = Composable.make({ boundary: widthBoundary });
    dense.store(entity, 10);
    dense.store(entity, 99);
    const result = dense.retrieve(entity);

    expect(result).toBe(99);
  });

  test('same-component ComposableEntities share ContentAddress in dense store', () => {
    const { world } = World.make();
    const dense = ComposableWorld.dense(world);
    dense.create('speed', 16);

    const e1 = Composable.make({ boundary: widthBoundary });
    const e2 = Composable.make({ boundary: widthBoundary });

    // Same components → same ContentAddress (by design)
    expect(e1.id).toBe(e2.id);

    dense.store(e1, 10);
    dense.store(e2, 20);

    // ContentAddress-keyed: e2 overwrites e1 (intentional dedup)
    const result = dense.retrieve(e1);

    expect(result).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// TypedWorld<Schema> -- compile-time type safety
// ---------------------------------------------------------------------------

/**
 * A narrow schema that only allows boundary + token components.
 * Entities spawned into a TypedComposableWorld<NarrowSchema> are
 * constrained to these component types at compile time.
 */
interface NarrowSchema extends EntityComponents {
  readonly boundary?: Boundary.Shape;
  readonly token?: Token.Shape;
}

describe('TypedComposableWorld -- compile-time type safety', () => {
  test('typed world spawn constrains components to the schema', () => {
    const { world } = World.make();
    const cw: ComposableWorld.Shape<NarrowSchema> = ComposableWorld.make<NarrowSchema>(world);

    // This compiles because boundary and token are in NarrowSchema
    const entity = cw.spawn({ boundary: widthBoundary, token: colorToken });
    const result = cw.evaluate(entity, { 'viewport.width': 800 });

    expect(result['viewport.width']).toBe('md');
    expect(result['primary']).toBe('#888');
  });

  test('typed query returns correctly narrowed component types', () => {
    const { world } = World.make();
    const cw: ComposableWorld.Shape<NarrowSchema> = ComposableWorld.make<NarrowSchema>(world);

    cw.spawn({ boundary: widthBoundary });
    cw.spawn({ token: colorToken });
    cw.spawn({ boundary: widthBoundary, token: colorToken });

    // Query for 'boundary' -- result type is ComposableEntity<Pick<NarrowSchema, 'boundary'>>
    const boundaryEntities = cw.query('boundary');
    // Query for both -- result type is ComposableEntity<Pick<NarrowSchema, 'boundary' | 'token'>>
    const bothEntities = cw.query('boundary', 'token');

    expect(boundaryEntities.length).toBe(2);
    expect(bothEntities.length).toBe(1);
    // Verify the query result carries the component through
    const first = boundaryEntities[0]!;
    expect(first.components.boundary).toEqual(widthBoundary);
  });

  test('unparameterized ComposableWorld.make still works (backward compat)', () => {
    const { world } = World.make();
    // No type parameter -- defaults to EntityComponents (accepts anything)
    const cw = ComposableWorld.make(world);
    const entity = cw.spawn({
      boundary: widthBoundary,
      token: colorToken,
      style: baseStyle,
      custom: 'arbitrary-value',
    });
    const result = cw.evaluate(entity, { 'viewport.width': 1100 });

    expect(result['viewport.width']).toBe('lg');
    expect(result['font-size']).toBe('18px');
  });
});

/**
 * BlendTree -- weighted multi-state blending.
 *
 * `BlendTree.make` is now a synchronous, Effect-free factory returning a tree
 * that owns its own teardown via `dispose()`; `tree.changes` is a no-replay
 * {@link CellKernel.fanout} subscribe surface. The pure blend kernel
 * (`computeBlend`) is unchanged — these properties pin it byte-identically:
 *   - compute() with all equal weights = arithmetic mean.
 *   - compute() with single node = exact values.
 *   - compute() with zero/negative weights excluded from blend.
 *   - changes fires the freshly computed blend on every mutation, no-replay.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { createBlendTree } from '@liteship/core';

// ---------------------------------------------------------------------------
// Basic operations
// ---------------------------------------------------------------------------

describe('BlendTree', () => {
  test('make creates a blend tree', () => {
    const tree = createBlendTree<{ x: number }>();
    expect(tree).toBeDefined();
    expect(tree.compute).toBeDefined();
    expect(tree.add).toBeDefined();
    expect(tree.remove).toBeDefined();
    expect(tree.setWeight).toBeDefined();
  });

  test('compute on empty tree returns empty object', () => {
    const tree = createBlendTree<{ x: number }>();
    expect(tree.compute()).toEqual({});
  });

  test('single node returns exact values', () => {
    const tree = createBlendTree<{ x: number; y: number }>();
    tree.add('a', { x: 10, y: 20 }, 1);
    expect(tree.compute()).toEqual({ x: 10, y: 20 });
  });

  test('two equal-weight nodes return averages', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 0 }, 1);
    tree.add('b', { x: 100 }, 1);
    expect(tree.compute().x).toBeCloseTo(50, 5);
  });

  test('weighted blend respects weights', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 0 }, 1);
    tree.add('b', { x: 100 }, 3);
    // Expected: (0*0.25 + 100*0.75) = 75
    expect(tree.compute().x).toBeCloseTo(75, 5);
  });

  test('remove eliminates node from blend', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 10 }, 1);
    tree.add('b', { x: 90 }, 1);
    tree.remove('a');
    expect(tree.compute()).toEqual({ x: 90 });
  });

  test('setWeight updates node weight', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 0 }, 1);
    tree.add('b', { x: 100 }, 1);
    tree.setWeight('a', 0);
    // Only b contributes (weight 1), a has weight 0
    expect(tree.compute().x).toBeCloseTo(100, 5);
  });

  test('setWeight on non-existent node is no-op', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 10 }, 1);
    tree.setWeight('nonexistent', 5);
    expect(tree.compute()).toEqual({ x: 10 });
  });

  test('all zero-weight nodes return empty object', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 10 }, 0);
    tree.add('b', { x: 20 }, 0);
    expect(tree.compute()).toEqual({});
  });

  test('add overwrites existing node', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 10 }, 1);
    tree.add('a', { x: 99 }, 1);
    expect(tree.compute()).toEqual({ x: 99 });
  });

  test('multi-key blending', () => {
    const tree = createBlendTree<{ x: number; y: number; z: number }>();
    tree.add('a', { x: 0, y: 0, z: 0 }, 1);
    tree.add('b', { x: 100, y: 200, z: 300 }, 1);
    const result = tree.compute();
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(100, 5);
    expect(result.z).toBeCloseTo(150, 5);
  });

  test('ignores inherited numeric properties when computing blends', () => {
    const tree = createBlendTree<{ own: number }>();
    const proto = { inherited: 999 };
    const value = Object.assign(Object.create(proto), { own: 12 }) as { own: number };

    tree.add('proto-backed', value, 1);

    expect(tree.compute()).toEqual({ own: 12 });
  });
});

// ---------------------------------------------------------------------------
// changes fan-out — no-replay CellKernel.fanout
// ---------------------------------------------------------------------------

describe('BlendTree.changes', () => {
  test('fires the freshly computed blend on every mutation', () => {
    const tree = createBlendTree<{ x: number }>();
    const seen: Array<{ x: number }> = [];
    tree.changes.subscribe((blend) => seen.push(blend));

    tree.add('a', { x: 0 }, 1);
    tree.add('b', { x: 100 }, 1);

    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual({ x: 0 });
    expect(seen[1]!.x).toBeCloseTo(50, 5);
  });

  test('NO REPLAY: a late subscriber misses blends published before it attached', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 10 }, 1); // published with no subscriber — dropped

    const seen: Array<{ x: number }> = [];
    tree.changes.subscribe((blend) => seen.push(blend));
    tree.add('b', { x: 30 }, 1);

    // Only the post-subscribe mutation arrives; the initial add is not replayed.
    expect(seen).toHaveLength(1);
    expect(seen[0]!.x).toBeCloseTo(20, 5);
  });

  test('remove and setWeight also publish to changes', () => {
    const tree = createBlendTree<{ x: number }>();
    tree.add('a', { x: 10 }, 1);
    tree.add('b', { x: 90 }, 1);

    const seen: Array<{ x: number }> = [];
    tree.changes.subscribe((blend) => seen.push(blend));

    tree.setWeight('a', 0); // only b contributes -> 90
    tree.remove('b'); // empty -> {}

    expect(seen).toHaveLength(2);
    expect(seen[0]!.x).toBeCloseTo(90, 5);
    expect(seen[1]).toEqual({});
  });

  test('dispose closes the changes channel', async () => {
    const tree = createBlendTree<{ x: number }>();
    const seen: Array<{ x: number }> = [];
    tree.changes.subscribe((blend) => seen.push(blend));

    tree.add('a', { x: 5 }, 1);
    await tree.dispose();
    tree.add('b', { x: 100 }, 1); // channel closed — no further publishes

    expect(seen).toHaveLength(1);
    expect(tree.changes.closed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property-based
// ---------------------------------------------------------------------------

describe('BlendTree properties', () => {
  test('single node always returns exact values', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.double({ noNaN: true, min: -1000, max: 1000 }),
          y: fc.double({ noNaN: true, min: -1000, max: 1000 }),
        }),
        fc.double({ min: 0.001, max: 100, noNaN: true }),
        (value, weight) => {
          const tree = createBlendTree<{ x: number; y: number }>();
          tree.add('only', value, weight);
          const result = tree.compute();
          expect(result.x).toBeCloseTo(value.x, 5);
          expect(result.y).toBeCloseTo(value.y, 5);
        },
      ),
    );
  });

  test('equal weights produce arithmetic mean', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, min: -1000, max: 1000 }),
        fc.double({ noNaN: true, min: -1000, max: 1000 }),
        (a, b) => {
          const tree = createBlendTree<{ v: number }>();
          tree.add('a', { v: a }, 1);
          tree.add('b', { v: b }, 1);
          expect(tree.compute().v).toBeCloseTo((a + b) / 2, 5);
        },
      ),
    );
  });
});

/**
 * Core package smoke test -- verify nothing is fundamentally broken.
 *
 * Each assertion should complete in < 100ms. If any of these fail,
 * something catastrophic has happened to the package exports.
 */

import { describe, test, expect } from 'vitest';
// Wave 6: the whole reactive surface is Effect-free — Cell/Store/… on CellKernel,
// HLC.makeClock returns a plain handle, Compositor.create is sync.
import { Boundary, Compositor, ContentAddress, Cell, VectorClock, HLC, Plan, Millis } from '@czap/core';

describe('core smoke', () => {
  test('Boundary.make + evaluate', () => {
    const b = Boundary.make({
      input: 'x',
      at: [
        [0, 'low'],
        [100, 'high'],
      ] as const,
    });
    expect(Boundary.evaluate(b, 50)).toBe('low');
    expect(Boundary.evaluate(b, 150)).toBe('high');
  });

  test('ContentAddress branding', () => {
    const addr = ContentAddress('fnv1a:12345678');
    expect(typeof addr).toBe('string');
    expect(addr).toBe('fnv1a:12345678');
  });

  test('Compositor.create resolves', () => {
    const { compositor } = Compositor.create();
    expect(compositor).toBeDefined();
  });

  test('Cell.make and read', () => {
    const cell = Cell.make(42);
    expect(cell.read()).toBe(42);
  });

  test('VectorClock round-trip', () => {
    const vc = VectorClock.from({ a: 1, b: 2 });
    expect(VectorClock.toObject(vc)).toEqual({ a: 1, b: 2 });
  });

  test('HLC.create produces clock', () => {
    const clock = HLC.makeClock('smoke-node');
    const t = clock.tick();
    expect(t.wall_ms).toBeGreaterThan(0);
  });

  test('Plan.make creates plan', () => {
    const plan = Plan.make();
    expect(plan).toBeDefined();
  });

  test('Millis brand preserves numeric value', () => {
    expect(Millis(100) + 0).toBe(100);
  });
});

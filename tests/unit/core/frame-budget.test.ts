/**
 * FrameBudget -- rAF priority lanes for frame budget management.
 *
 * Property: critical tasks always run regardless of budget.
 * Property: remaining() is always >= 0.
 *
 * Wave 8: FrameBudget is fully native — make() is synchronous, scheduleSync/fpsSync
 * are plain, and the rAF loop's teardown is owned by a Lifetime (was Effect Scope).
 */

import { describe, test, expect, vi } from 'vitest';
import { FrameBudget } from '@czap/core';
import { hasTag } from '@czap/error';

// ---------------------------------------------------------------------------
// Basic operations
// ---------------------------------------------------------------------------

describe('FrameBudget', () => {
  test('make creates a frame budget', () => {
    const budget = FrameBudget.make();
    expect(budget).toBeDefined();
    expect(budget.remaining).toBeDefined();
    expect(budget.canRun).toBeDefined();
    expect(budget.scheduleSync).toBeDefined();
  });

  test('remaining() returns non-negative value', () => {
    const budget = FrameBudget.make();
    expect(budget.remaining()).toBeGreaterThanOrEqual(0);
  });

  test('default targetFps is 60 (~16.67ms budget)', () => {
    const budget = FrameBudget.make();
    // remaining() at start should be close to 16.67ms
    expect(budget.remaining()).toBeLessThanOrEqual(16.67);
  });

  test('custom targetFps adjusts budget', () => {
    const budget = FrameBudget.make({ targetFps: 30 });
    // 1000/30 = ~33.33ms budget
    expect(budget.remaining()).toBeLessThanOrEqual(33.34);
  });

  test('canRun(critical) always true', () => {
    const budget = FrameBudget.make();
    expect(budget.canRun('critical')).toBe(true);
  });

  test('scheduleSync runs critical task even with no budget', () => {
    const budget = FrameBudget.make();
    const result = budget.scheduleSync('critical', () => 42);
    expect(result).toBe(42);
  });

  test('scheduleSync returns null for low-priority task with no budget', () => {
    // This is hard to guarantee deterministically without controlling time,
    // but with a tiny fps (e.g. 100000) the budget is ~0.01ms which may already be spent
    const budget = FrameBudget.make({ targetFps: 100000 });

    // Burn CPU to exhaust the budget
    const start = performance.now();
    while (performance.now() - start < 1) {
      /* spin */
    }

    const result = budget.scheduleSync('idle', () => 42);

    // With targetFps=100000 the frame budget is ~0.01ms; after burning 1ms of CPU
    // the budget is exhausted, so an 'idle' task should be skipped.
    expect(result).toBeNull();
  });

  test('fpsSync returns a positive number', () => {
    const budget = FrameBudget.make();
    expect(typeof budget.fpsSync).toBe('number');
    expect(budget.fpsSync).toBeGreaterThan(0);
  });

  test('lifetime.dispose() cancels the rAF loop (Lifetime owns the teardown — was Effect Scope)', async () => {
    // In node there is no requestAnimationFrame, so mock the pair to prove the
    // Lifetime registers cancelAnimationFrame as its finalizer.
    const raf = vi.fn((_cb: FrameRequestCallback): number => 123);
    const caf = vi.fn();
    const g = globalThis as unknown as {
      requestAnimationFrame?: typeof requestAnimationFrame;
      cancelAnimationFrame?: typeof cancelAnimationFrame;
    };
    const origRaf = g.requestAnimationFrame;
    const origCaf = g.cancelAnimationFrame;
    g.requestAnimationFrame = raf as unknown as typeof requestAnimationFrame;
    g.cancelAnimationFrame = caf as unknown as typeof cancelAnimationFrame;
    try {
      const budget = FrameBudget.make();
      expect(raf).toHaveBeenCalledTimes(1);
      await budget.lifetime.dispose();
      expect(caf).toHaveBeenCalledWith(123);
    } finally {
      g.requestAnimationFrame = origRaf;
      g.cancelAnimationFrame = origCaf;
    }
  });
});

// ---------------------------------------------------------------------------
// Priority thresholds
// ---------------------------------------------------------------------------

describe('FrameBudget priority thresholds', () => {
  test('high needs >= 2ms remaining', () => {
    const budget = FrameBudget.make({ targetFps: 60 });
    // At frame start the full 16.67ms budget should be available
    expect(budget.remaining()).toBeGreaterThanOrEqual(2);
    expect(budget.canRun('high')).toBe(true);
  });

  test('low needs >= 6ms remaining', () => {
    const budget = FrameBudget.make({ targetFps: 60 });
    expect(budget.remaining()).toBeGreaterThanOrEqual(6);
    expect(budget.canRun('low')).toBe(true);
  });

  test('idle needs >= 12ms remaining', () => {
    const budget = FrameBudget.make({ targetFps: 60 });
    expect(budget.remaining()).toBeGreaterThanOrEqual(12);
    expect(budget.canRun('idle')).toBe(true);
  });

  function expectValidationError(fn: () => unknown): void {
    try {
      fn();
      expect.unreachable('expected a ValidationError to be thrown');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  }

  test('rejects targetFps of zero', () => {
    expectValidationError(() => FrameBudget.make({ targetFps: 0 }));
  });

  test('rejects negative targetFps', () => {
    expectValidationError(() => FrameBudget.make({ targetFps: -1 }));
  });

  test('rejects Infinity targetFps', () => {
    expectValidationError(() => FrameBudget.make({ targetFps: Infinity }));
  });
});

/**
 * Component test: AnimatedQuantizer.
 *
 * Tests animated transitions between discrete states,
 * interpolation, and transition resolution.
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Millis, CellKernel } from '@czap/core';
import type { ReactiveQuantizer, BoundaryCrossing } from '@czap/core';
import { AnimatedQuantizer } from '@czap/quantizer';
import type { TransitionMap } from '@czap/quantizer';

/**
 * Build a mock reactive Quantizer with controllable boundary crossings. `state`
 * is a replay-1 slot advanced by `evaluate`, `changes` a no-replay fan-out the
 * test drives via `pushCrossing`; `shutdown` closes it.
 */
function makeMockQuantizer(boundary: Boundary.Shape, initialState: string) {
  const changes = CellKernel.fanout<BoundaryCrossing<string>>();
  const stateCell = CellKernel.replay1<string>(initialState);
  return {
    _tag: 'Quantizer' as const,
    boundary,
    state: stateCell,
    changes,
    evaluate(value: number): string {
      const result = Boundary.evaluate(boundary, value) as string;
      stateCell.publish(result);
      return result;
    },
    pushCrossing: (c: BoundaryCrossing<string>) => changes.publish(c),
    shutdown: () => changes.close(),
  } satisfies ReactiveQuantizer<Boundary.Shape> & {
    pushCrossing: (c: BoundaryCrossing<string>) => void;
    shutdown: () => void;
  };
}

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnimatedQuantizer', () => {
  test('make() creates an animated quantizer with expected shape', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const transitions: TransitionMap<string> = {
      '*': { duration: Millis(300) },
    };

    const { animated, lifetime } = AnimatedQuantizer.make(q, transitions);

    expect(animated.boundary).toBe(widthBoundary);
    expect(animated.transition).toBeDefined();
    expect(animated.interpolated).toBeDefined();
    expect(animated.evaluate).toBeDefined();
    expect(animated.state.read()).toBe('mobile');

    await lifetime.dispose();
  });

  test('evaluate delegates to underlying quantizer', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const { animated, lifetime } = AnimatedQuantizer.make(q, { '*': { duration: Millis(0) } });

    const result = animated.evaluate(800);
    expect(result).toBe('tablet');

    await lifetime.dispose();
  });

  test('transition resolver picks exact match over wildcard', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const transitions: TransitionMap<string> = {
      '*': { duration: Millis(1000) },
      'mobile->tablet': { duration: Millis(50) },
    };

    const { animated, lifetime } = AnimatedQuantizer.make(q, transitions);

    const config = animated.transition.getTransition('mobile', 'tablet');
    expect(config.duration).toBe(50);

    await lifetime.dispose();
  });

  test('transition resolver falls back to wildcard', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const transitions: TransitionMap<string> = {
      '*': { duration: Millis(500) },
    };

    const { animated, lifetime } = AnimatedQuantizer.make(q, transitions);

    const config = animated.transition.getTransition('mobile', 'desktop');
    expect(config.duration).toBe(500);

    await lifetime.dispose();
  });

  test('transition resolver falls back to instant (duration 0) when no match', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const transitions: TransitionMap<string> = {
      'mobile->tablet': { duration: Millis(100) },
    };

    const { animated, lifetime } = AnimatedQuantizer.make(q, transitions);

    // No match for tablet->desktop, and no wildcard.
    const config = animated.transition.getTransition('tablet', 'desktop');
    expect(config.duration).toBe(0);

    await lifetime.dispose();
  });

  test('boundary is preserved from underlying quantizer', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const { animated, lifetime } = AnimatedQuantizer.make(q, {});

    expect(animated.boundary).toBe(widthBoundary);
    expect(animated.boundary.states).toEqual(['mobile', 'tablet', 'desktop']);

    await lifetime.dispose();
  });

  test('outputs parameter is optional', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const { animated, lifetime } = AnimatedQuantizer.make(q, { '*': { duration: Millis(100) } });
    // Should not throw.
    expect(animated).toBeDefined();

    await lifetime.dispose();
  });

  test('evaluate returns correct state for different values', async () => {
    const q = makeMockQuantizer(widthBoundary, 'mobile');
    const { animated, lifetime } = AnimatedQuantizer.make(q, {});

    expect(animated.evaluate(0)).toBe('mobile');
    expect(animated.evaluate(500)).toBe('mobile');
    expect(animated.evaluate(768)).toBe('tablet');
    expect(animated.evaluate(900)).toBe('tablet');
    expect(animated.evaluate(1024)).toBe('desktop');
    expect(animated.evaluate(2000)).toBe('desktop');

    await lifetime.dispose();
  });
});

// @vitest-environment jsdom
/**
 * Drift guard: the `scroll.progress` SCALE agrees across every reader.
 *
 * CANONICAL SCALE: 0..1 (window.scrollY / max), matching `Signal` — the
 * `SignalSource` source of truth in `core/src/signal.ts`. A boundary authored
 * at `0.5` must mean "half scrolled" everywhere.
 *
 * Before 0.3.0 the Astro runtime (`readSignalValue`) returned 0..100 while
 * `Signal` returned 0..1, so a 0.5 boundary evaluated wrong. This guard pins:
 *   - the runtime reader to 0..1, and
 *   - that it returns the SAME value as `Signal`'s source-of-truth reader for
 *     the same scrollY (computed from the source of truth, not hardcoded).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import { Signal } from '@czap/core';
import { readSignalValue } from '../../../packages/astro/src/runtime/boundary.js';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

function setScroll(scrollY: number, scrollHeight: number, innerHeight: number): void {
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, configurable: true });
}

describe('scroll.progress scale drift guard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('runtime reader returns 0..1, never 0..100', () => {
    setScroll(500, 1600, 600); // max = 1000 → 0.5
    const v = readSignalValue('scroll.progress');
    expect(v).toBeCloseTo(0.5, 6);
    expect(v).toBeLessThanOrEqual(1);
  });

  test('runtime reader === Signal source-of-truth reader for the same scrollY', async () => {
    // Expected is COMPUTED from the source of truth (Signal), never hardcoded.
    for (const [scrollY, scrollHeight, innerHeight] of [
      [0, 2000, 800],
      [300, 2000, 800],
      [1200, 2000, 800],
      [9999, 2000, 800], // clamps
    ] as const) {
      setScroll(scrollY, scrollHeight, innerHeight);

      const sourceOfTruth = await runScoped(
        Effect.gen(function* () {
          const sig = yield* Signal.make({ type: 'scroll', axis: 'progress' });
          return yield* sig.current;
        }),
      );
      const runtime = readSignalValue('scroll.progress');

      // Signal does not clamp above 1; the runtime clamps to [0,1]. Compare on
      // the clamped value so both agree on the canonical 0..1 contract.
      expect(runtime).toBeCloseTo(Math.min(1, Math.max(0, sourceOfTruth)), 6);
    }
  });

  test('zero scrollable height yields 0 in both readers', async () => {
    setScroll(0, 600, 600); // max <= 0
    const sourceOfTruth = await runScoped(
      Effect.gen(function* () {
        const sig = yield* Signal.make({ type: 'scroll', axis: 'progress' });
        return yield* sig.current;
      }),
    );
    expect(readSignalValue('scroll.progress')).toBe(0);
    expect(sourceOfTruth).toBe(0);
  });
});

/**
 * Property test: Boundary monotonicity and hysteresis laws.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Boundary, defineBoundary } from '@liteship/core';

// ---------------------------------------------------------------------------
// Arbitrary: sorted threshold-state pairs
// ---------------------------------------------------------------------------

const arbThresholdPairs = fc
  .uniqueArray(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 8 })
  .map((vals) => vals.sort((a, b) => a - b).map((t, i) => [t, `s${i}`] as const));

describe('Boundary properties', () => {
  test('evaluate is monotonic: increasing value → non-decreasing state index', () => {
    fc.assert(
      fc.property(arbThresholdPairs, fc.float({ min: 0, max: 10000 }), (pairs, value) => {
        const boundary = defineBoundary({ input: 'x', at: pairs as any });
        const states = boundary.states as readonly string[];

        const stateA = Boundary.evaluate(boundary, value) as string;
        const stateB = Boundary.evaluate(boundary, value + 1) as string;

        const idxA = states.indexOf(stateA);
        const idxB = states.indexOf(stateB);

        return idxB >= idxA;
      }),
    );
  });

  test('evaluate returns a valid state for any value', () => {
    fc.assert(
      fc.property(arbThresholdPairs, fc.float({ min: -1000, max: 20000 }), (pairs, value) => {
        const boundary = defineBoundary({ input: 'x', at: pairs as any });
        const states = boundary.states as readonly string[];
        const result = Boundary.evaluate(boundary, value) as string;
        return states.includes(result);
      }),
    );
  });

  test('thresholds are stored sorted ascending', () => {
    fc.assert(
      fc.property(arbThresholdPairs, (pairs) => {
        const boundary = defineBoundary({ input: 'x', at: pairs as any });
        const thresholds = boundary.thresholds;
        for (let i = 1; i < thresholds.length; i++) {
          if (thresholds[i] <= thresholds[i - 1]) return false;
        }
        return true;
      }),
    );
  });

  test('value below all thresholds → first state', () => {
    fc.assert(
      fc.property(arbThresholdPairs, (pairs) => {
        const boundary = defineBoundary({ input: 'x', at: pairs as any });
        const minThreshold = boundary.thresholds[0] as number;
        const result = Boundary.evaluate(boundary, minThreshold - 1);
        return result === boundary.states[0];
      }),
    );
  });

  test('value at or above highest threshold → last state', () => {
    fc.assert(
      fc.property(arbThresholdPairs, (pairs) => {
        const boundary = defineBoundary({ input: 'x', at: pairs as any });
        const maxThreshold = boundary.thresholds[boundary.thresholds.length - 1] as number;
        const result = Boundary.evaluate(boundary, maxThreshold + 1000);
        return result === boundary.states[boundary.states.length - 1];
      }),
    );
  });

  test('hysteresis: crossing up requires exceeding threshold + half', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 1000 }), fc.integer({ min: 10, max: 50 }), (threshold, hysteresis) => {
        const boundary = defineBoundary({
          input: 'x',
          at: [
            [0, 'low'],
            [threshold, 'high'],
          ] as any,
          hysteresis,
        });

        const half = hysteresis / 2;

        // Just under threshold + half → should stay 'low'
        const belowHyst = Boundary.evaluateWithHysteresis(boundary, threshold + half - 1, 'low');
        // Well above threshold + half → should go 'high'
        const aboveHyst = Boundary.evaluateWithHysteresis(boundary, threshold + half + 1, 'low');

        return belowHyst === 'low' && aboveHyst === 'high';
      }),
    );
  });

  test('content address is deterministic', () => {
    fc.assert(
      fc.property(arbThresholdPairs, (pairs) => {
        const b1 = defineBoundary({ input: 'x', at: pairs as any });
        const b2 = defineBoundary({ input: 'x', at: pairs as any });
        return b1.id === b2.id;
      }),
    );
  });

  test('content address format matches fnv1a:XXXXXXXX', () => {
    fc.assert(
      fc.property(arbThresholdPairs, (pairs) => {
        const boundary = defineBoundary({ input: 'x', at: pairs as any });
        return /^fnv1a:[0-9a-f]{8}$/.test(boundary.id);
      }),
    );
  });

  test('authored portable activation inputs cannot mutate behavior under a minted id', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.string({ minLength: 1, maxLength: 24 }),
        (from, duration, experimentId) => {
          const timeRange = { from, until: from + duration };
          const spec = { timeRange, experimentId };
          const at: [number, 'low' | 'high'][] = [
            [0, 'low'],
            [100, 'high'],
          ];
          const boundary = defineBoundary({ input: 'x', at, spec });
          const before = {
            id: boundary.id,
            thresholds: [...boundary.thresholds],
            timeRange: { ...boundary.spec!.timeRange },
            experimentId: boundary.spec!.experimentId,
          };

          at[1]![0] = 200;
          timeRange.from -= 1;
          spec.experimentId = `${experimentId}-changed`;

          expect(boundary.id).toBe(before.id);
          expect(boundary.thresholds).toEqual(before.thresholds);
          expect(boundary.spec?.timeRange).toEqual(before.timeRange);
          expect(boundary.spec?.experimentId).toBe(before.experimentId);
        },
      ),
    );
  });
});

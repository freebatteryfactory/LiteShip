/** Generated motion fallback metadata is a faithful projection of authored stops. @module */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { StateName, type CssMotionPlan } from '@liteship/core';
import { MotionCompiler } from '@liteship/compiler';

function planFor(values: readonly number[]): CssMotionPlan {
  return {
    selector: '[data-liteship-boundary="fallback-proof"]',
    fromState: StateName('before'),
    toState: StateName('after'),
    properties: [
      {
        property: 'opacity',
        from: { k: 'opacity', v: values[0]! },
        to: { k: 'opacity', v: values.at(-1)! },
      },
    ],
    durationMs: 1000,
    routing: 'seq',
    transitionProperty: 'opacity',
    nativeTimeline: { eligible: true },
    keyframes: values.map((value, index) => ({
      offset: index / (values.length - 1),
      properties: { opacity: String(value) },
    })),
  };
}

function compressed(values: readonly number[]): readonly number[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

describe('motion transition fallback support metadata', () => {
  it('classifies arbitrary multi-stop paths without hiding returning motion', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 2, maxLength: 12 }),
        (values) => {
          const distinctPath = compressed(values);
          const support = MotionCompiler.compile({ plan: planFor(values) }).support.transitionFallback;
          const approximated = distinctPath.length > 2;
          const returning =
            approximated &&
            distinctPath[0] === distinctPath.at(-1) &&
            distinctPath.slice(1, -1).some((value) => value !== distinctPath[0]);

          expect(support.contract).toBe('single-segment-monotonic-only');
          expect(support.fidelity).toBe(approximated ? 'monotonic-endpoint-only' : 'faithful-single-segment');
          expect(support.approximatedProperties).toEqual(approximated ? ['opacity'] : []);
          expect(support.returningProperties).toEqual(returning ? ['opacity'] : []);
        },
      ),
      { seed: 0x14_9f_a11b, numRuns: 160 },
    );
  });

  it('keeps support classification invariant under duplicate adjacent stops', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 2, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        (values, index) => {
          const insertion = index % values.length;
          const duplicated = [...values.slice(0, insertion), values[insertion]!, ...values.slice(insertion)];
          expect(MotionCompiler.compile({ plan: planFor(duplicated) }).support).toEqual(
            MotionCompiler.compile({ plan: planFor(values) }).support,
          );
        },
      ),
      { seed: 0x14_9d_ed0, numRuns: 120 },
    );
  });
});

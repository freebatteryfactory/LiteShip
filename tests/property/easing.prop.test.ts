/**
 * Property test: Easing boundary conditions.
 *
 * All standard easings satisfy f(0) = 0 and f(1) = 1.
 * Linear easing is identity. Spring easings converge.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { Easing } from '@liteship/core';

const standardEasings: Array<[string, (t: number) => number]> = [
  ['linear', Easing.linear],
  ['easeInCubic', Easing.easeInCubic],
  ['easeOutCubic', Easing.easeOutCubic],
  ['easeInOutCubic', Easing.easeInOutCubic],
  ['easeOutExpo', Easing.easeOutExpo],
  ['ease', Easing.ease],
  ['easeIn', Easing.easeIn],
  ['easeOut', Easing.easeOut],
  ['easeInOut', Easing.easeInOut],
];

describe('Easing properties', () => {
  describe.each(standardEasings)('%s', (_name, fn) => {
    test('f(0) ≈ 0', () => {
      // Use approximate equality to handle floating point
      const result = fn(0);
      fc.assert(fc.property(fc.constant(null), () => Math.abs(result) < 1e-10));
    });

    test('f(1) ≈ 1', () => {
      const result = fn(1);
      fc.assert(fc.property(fc.constant(null), () => Math.abs(result - 1) < 1e-10));
    });

    test('output is finite for all t in [0, 1]', () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (t) => {
          const result = fn(t);
          return Number.isFinite(result);
        }),
      );
    });
  });

  test('linear is identity: f(t) = t', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (t) => {
        return Math.abs(Easing.linear(t) - t) < 1e-10;
      }),
    );
  });

  test('easeOutBounce f(0) = 0 and f(1) = 1', () => {
    const result0 = Easing.easeOutBounce(0);
    const result1 = Easing.easeOutBounce(1);
    fc.assert(fc.property(fc.constant(null), () => Math.abs(result0) < 1e-10 && Math.abs(result1 - 1) < 1e-10));
  });

  test('easeOutElastic f(0) = 0 and f(1) = 1', () => {
    const result0 = Easing.easeOutElastic(0);
    const result1 = Easing.easeOutElastic(1);
    fc.assert(fc.property(fc.constant(null), () => Math.abs(result0) < 1e-10 && Math.abs(result1 - 1) < 1e-10));
  });

  test('easeOutElastic stays finite for interior values', () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0.001), max: Math.fround(0.999), noNaN: true }), (t) => {
        const result = Easing.easeOutElastic(t);
        return Number.isFinite(result);
      }),
    );
  });

  test('easeOutBounce covers each bounce segment', () => {
    const samples = [0.1, 0.5, 0.8, 0.95].map((t) => Easing.easeOutBounce(t));
    for (const value of samples) {
      fc.assert(fc.property(fc.constant(null), () => Number.isFinite(value) && value >= 0));
    }
  });

  test('cubicBezier satisfies f(0) = 0 and f(1) = 1', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: -2, max: 2, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: -2, max: 2, noNaN: true }),
        (x1, y1, x2, y2) => {
          const fn = Easing.cubicBezier(x1, y1, x2, y2);
          return Math.abs(fn(0)) < 0.01 && Math.abs(fn(1) - 1) < 0.01;
        },
      ),
    );
  });

  test('spring converges to 1 at t=1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 500 }), fc.integer({ min: 5, max: 50 }), (stiffness, damping) => {
        const fn = Easing.spring({ stiffness, damping, mass: 1 });
        const result = fn(1);
        // Spring should be close to 1 at t=1 (within tolerance)
        return Math.abs(result - 1) < 0.15;
      }),
    );
  });

  test('springNaturalDuration falls back to the default duration when epsilon never trips the scan', () => {
    const duration = Easing.springNaturalDuration({ stiffness: 200, damping: 15, mass: 1 }, Number.POSITIVE_INFINITY);
    fc.assert(fc.property(fc.constant(null), () => duration === 0.3));
  });
});

// ── easingToLinearCSS: the shared sampler behind Law 4 (byte-law) ────
// The CSS `linear()` string and the JS floor MUST sample the SAME point list.
// `easingToLinearCSS(fn)` is the single producer of that list; `springToLinearCSS`
// delegates to it so the spring path stays byte-identical.

function parseLinearPoints(css: string): number[] {
  const match = /^linear\((.*)\)$/.exec(css);
  if (!match) throw new Error(`not a linear() timing function: ${css}`);
  return match[1].split(',').map((segment) => Number(segment.trim()));
}

const catalogEasings: Array<[string, (t: number) => number]> = [
  ['linear', Easing.linear],
  ['ease', Easing.ease],
  ['easeInCubic', Easing.easeInCubic],
  ['easeOutCubic', Easing.easeOutCubic],
  ['easeInOutCubic', Easing.easeInOutCubic],
  ['easeOutExpo', Easing.easeOutExpo],
  ['easeOutBack', Easing.easeOutBack],
  ['easeOutElastic', Easing.easeOutElastic],
  ['easeOutBounce', Easing.easeOutBounce],
  ['easeIn', Easing.easeIn],
  ['easeOut', Easing.easeOut],
  ['easeInOut', Easing.easeInOut],
];

describe('easingToLinearCSS — Law 4 point parity by construction', () => {
  describe.each(catalogEasings)('%s', (_name, fn) => {
    test('linear() points faithfully sample fn(i/n) for any sampleCount', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 64 }), (sampleCount) => {
          const points = parseLinearPoints(Easing.easingToLinearCSS(fn, sampleCount));
          // One point per sample stop, inclusive of both endpoints.
          if (points.length !== sampleCount + 1) return false;
          for (let i = 0; i <= sampleCount; i++) {
            // Each emitted point is fn(i/n) rounded to 4 decimals — the SAME list the
            // JS floor will lerp. Rounding error is bounded by half an ulp of 1e-4.
            if (Math.abs(points[i] - fn(i / sampleCount)) > 1e-4) return false;
          }
          return true;
        }),
      );
    });
  });

  test('default sampleCount emits 33 points (32 segments)', () => {
    const points = parseLinearPoints(Easing.easingToLinearCSS(Easing.easeOutCubic));
    fc.assert(fc.property(fc.constant(null), () => points.length === 33));
  });

  test('springToLinearCSS delegates to easingToLinearCSS (byte-identical output)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 400 }),
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 2, max: 64 }),
        (stiffness, damping, sampleCount) => {
          const config = { stiffness, damping, mass: 1 };
          return (
            Easing.springToLinearCSS(config, sampleCount) ===
            Easing.easingToLinearCSS(Easing.spring(config), sampleCount)
          );
        },
      ),
    );
  });
});

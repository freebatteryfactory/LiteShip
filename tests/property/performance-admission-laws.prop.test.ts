/** Metamorphic evidence-admission laws for every claim-bearing complexity curve. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  COMPLEXITY_ADMISSION_POLICY,
  complexityAdmissionReasons,
  type ComplexityAdmissionCandidate,
} from '../../packages/gauntlet/src/gates/performance-contracts.js';
import { lowerEnvelopeCoefficientOfVariation } from '../../scripts/bench/contracts.js';

const GREEN: ComplexityAdmissionCandidate = {
  sizes: [16, 32, 64, 128, 256],
  replicates: 7,
  fittedR2: 0.95,
  coefficientOfVariation: 0.05,
};

function reasons(overrides: Partial<ComplexityAdmissionCandidate> = {}) {
  return complexityAdmissionReasons({ ...GREEN, ...overrides });
}

describe('uniform performance evidence admission', () => {
  it('pins one non-negotiable policy for all claim-bearing curves', () => {
    expect(COMPLEXITY_ADMISSION_POLICY).toEqual({
      minimumR2: 0.9,
      minimumSizes: 5,
      minimumReplicatesPerSize: 7,
      minimumSizeGrowthFactor: 2,
      maximumCoefficientOfVariation: 0.25,
    });
    expect(Object.isFrozen(COMPLEXITY_ADMISSION_POLICY)).toBe(true);
    expect(reasons()).toEqual([]);
  });

  it.each([
    ['four sizes', { sizes: [16, 32, 64, 128] }, ['insufficient-size-sweep']],
    ['flat sizes', { sizes: [16, 32, 32, 128, 256] }, ['invalid-size-sweep']],
    ['shrinking sizes', { sizes: [16, 32, 64, 32, 256] }, ['invalid-size-sweep']],
    ['zero size', { sizes: [0, 16, 32, 64, 128] }, ['invalid-size-sweep']],
    ['negative size', { sizes: [-1, 16, 32, 64, 128] }, ['invalid-size-sweep']],
    ['six replicates', { replicates: 6 }, ['under-replicated']],
    ['fractional replicates', { replicates: 7.5 }, ['under-replicated']],
    ['low fit', { fittedR2: 0.899_999 }, ['low-r2']],
    ['NaN fit', { fittedR2: Number.NaN }, ['low-r2']],
    ['infinite fit', { fittedR2: Number.POSITIVE_INFINITY }, ['low-r2']],
    ['high variance', { coefficientOfVariation: 0.250_001 }, ['unstable-variance']],
    ['negative variance', { coefficientOfVariation: -0.001 }, ['unstable-variance']],
    ['NaN variance', { coefficientOfVariation: Number.NaN }, ['unstable-variance']],
    ['infinite variance', { coefficientOfVariation: Number.POSITIVE_INFINITY }, ['unstable-variance']],
  ] as const)('refuses %s with its precise reason', (_label, mutation, expected) => {
    expect(reasons(mutation)).toEqual(expected);
  });

  it('accepts every exact policy boundary rather than requiring hidden headroom', () => {
    expect(
      complexityAdmissionReasons({
        sizes: [1, 2, 4, 8, 16],
        replicates: COMPLEXITY_ADMISSION_POLICY.minimumReplicatesPerSize,
        fittedR2: COMPLEXITY_ADMISSION_POLICY.minimumR2,
        coefficientOfVariation: COMPLEXITY_ADMISSION_POLICY.maximumCoefficientOfVariation,
      }),
    ).toEqual([]);
  });

  it('reports independent defects together in stable constitutional order', () => {
    expect(
      reasons({
        sizes: [0, 0],
        replicates: 1,
        fittedR2: 0.2,
        coefficientOfVariation: 2,
      }),
    ).toEqual(['insufficient-size-sweep', 'invalid-size-sweep', 'under-replicated', 'low-r2', 'unstable-variance']);
  });

  it('is deterministic for arbitrary numeric evidence, including non-finite inputs', () => {
    const number = fc.oneof(fc.double({ noNaN: true }), fc.constant(Number.NaN), fc.constant(Number.POSITIVE_INFINITY));
    fc.assert(
      fc.property(
        fc.array(number, { maxLength: 10 }),
        fc.integer(),
        number,
        number,
        (sizes, replicates, fittedR2, cv) => {
          const candidate = { sizes, replicates, fittedR2, coefficientOfVariation: cv };
          expect(complexityAdmissionReasons(candidate)).toEqual(complexityAdmissionReasons({ ...candidate }));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('adding a valid geometric tail cannot invalidate a previously valid sweep', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000 }),
        fc.integer({ min: 5, max: 12 }),
        fc.integer({ min: 1, max: 5 }),
        (start, length, extra) => {
          const sizes = Array.from({ length }, (_, index) => start * 2 ** index);
          const extended = [...sizes, ...Array.from({ length: extra }, (_, index) => sizes.at(-1)! * 2 ** (index + 1))];
          expect(reasons({ sizes })).toEqual([]);
          expect(reasons({ sizes: extended })).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('improving repetitions, fit, or variance never introduces a finding', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 7, max: 100 }),
        fc.double({ min: 0.9, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 0.25, noNaN: true }),
        (replicates, fittedR2, coefficientOfVariation) => {
          expect(reasons({ replicates, fittedR2, coefficientOfVariation })).toEqual([]);
          expect(
            reasons({
              replicates: replicates + 1,
              fittedR2: Math.min(1, fittedR2 + 0.01),
              coefficientOfVariation: coefficientOfVariation / 2,
            }),
          ).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('uses the lower envelope so one warmup outlier cannot manufacture instability', () => {
    const steady = [100, 101, 99, 100, 102, 98, 100];
    const withWarmupOutlier = [5_000, ...steady];
    expect(lowerEnvelopeCoefficientOfVariation(withWarmupOutlier)).toBeCloseTo(
      lowerEnvelopeCoefficientOfVariation(steady),
      10,
    );
  });

  it('still exposes unstable lower-envelope samples instead of trimming all disagreement', () => {
    const unstable = [10, 20, 40, 80, 160, 320, 640];
    expect(lowerEnvelopeCoefficientOfVariation(unstable)).toBeGreaterThan(
      COMPLEXITY_ADMISSION_POLICY.maximumCoefficientOfVariation,
    );
  });

  it('is scale-invariant for positive timing units', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.001, max: 1_000, noNaN: true }), { minLength: 7, maxLength: 20 }),
        fc.double({ min: 0.001, max: 1_000, noNaN: true }),
        (samples, scale) => {
          const original = lowerEnvelopeCoefficientOfVariation(samples);
          const scaled = lowerEnvelopeCoefficientOfVariation(samples.map((sample) => sample * scale));
          expect(scaled).toBeCloseTo(original, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns a finite zero for an exactly stable sample', () => {
    expect(lowerEnvelopeCoefficientOfVariation([42, 42, 42, 42, 42, 42, 42])).toBe(0);
  });
});

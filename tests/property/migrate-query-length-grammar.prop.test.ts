/**
 * Declared-grammar properties for the query lengths shared by media, Tailwind,
 * and container migration.
 *
 * The grammar is intentionally smaller than CSS `<length>`: finite,
 * non-negative px/em/rem thresholds plus unitless zero. Invalid syntax is
 * refused before host resolution, and one invalid breakpoint transaction emits
 * no partial boundary. Representable thresholds are compared against the
 * source predicate directly at its edge.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Boundary } from '@liteship/core';
import { fromContainerQueries, fromMediaQueries, fromTailwindTheme } from '@liteship/compiler/migrate';
import { parseQueryLength, QUERY_LENGTH_GRAMMAR } from '../../packages/compiler/src/migrate/query-length.js';

const unitArb = fc.constantFrom('px' as const, 'em' as const, 'rem' as const);

const validLengthArb = fc
  .record({
    coefficient: fc.integer({ min: 0, max: 100_000 }),
    fraction: fc.integer({ min: 0, max: 999 }),
    unit: unitArb,
    uppercase: fc.boolean(),
    explicitPlus: fc.boolean(),
    outerWhitespace: fc.boolean(),
  })
  .map(({ coefficient, fraction, unit, uppercase, explicitPlus, outerWhitespace }) => {
    const numeric = `${explicitPlus ? '+' : ''}${coefficient}.${fraction.toString().padStart(3, '0')}`;
    const authoredUnit = uppercase ? unit.toUpperCase() : unit;
    const source = `${numeric}${authoredUnit}`;
    return {
      source: outerWhitespace ? `  ${source}\t` : source,
      value: Number(numeric),
      unit,
    };
  });

const invalidLengthArb = fc.oneof(
  fc.tuple(fc.integer({ min: 1, max: 1_000_000 }), unitArb).map(([value, unit]) => `-${value}${unit}`),
  fc.tuple(fc.integer({ min: 309, max: 999 }), unitArb).map(([exponent, unit]) => `1e${exponent}${unit}`),
  fc.integer({ min: 1, max: 1_000_000 }).map(String),
  fc
    .tuple(fc.integer({ min: 0, max: 1_000_000 }), fc.constantFrom('vw', 'vh', 'ch', 'pt', 'fr', '%'))
    .map(([value, unit]) => `${value}${unit}`),
  fc.constantFrom('1 px', 'NaNpx', 'Infinitypx', '--1px', '1.2.3px'),
);

function expectThresholdPredicate(boundary: Parameters<typeof Boundary.evaluate>[0], threshold: number): void {
  expect(Boundary.evaluate(boundary, threshold - 0.5)).toBe(boundary.states[0]);
  expect(Boundary.evaluate(boundary, threshold)).toBe(boundary.states[1]);
  expect(Boundary.evaluate(boundary, threshold + 0.5)).toBe(boundary.states[1]);
}

describe('query-length declared grammar', () => {
  test('the declaration is frozen and load-bearing', () => {
    expect(QUERY_LENGTH_GRAMMAR).toEqual({
      id: 'query-length/v1',
      units: ['px', 'em', 'rem'],
      minimum: 0,
      unitless: 'zero-only',
      finite: true,
      preservesAuthoredUnit: true,
    });
    expect(Object.isFrozen(QUERY_LENGTH_GRAMMAR)).toBe(true);
    expect(Object.isFrozen(QUERY_LENGTH_GRAMMAR.units)).toBe(true);
  });

  test('accepts finite non-negative authored units without collapsing them', () => {
    fc.assert(
      fc.property(validLengthArb, ({ source, value, unit }) => {
        expect(parseQueryLength(source)).toEqual({ value, unit });
      }),
      { seed: 0x5eed_1701, numRuns: 300 },
    );
  });

  test('accepts only unitless zero and normalizes signed zero', () => {
    fc.assert(
      fc.property(fc.constantFrom('0', '+0', '-0', '0.0', '-0.000', '0e999', '  +0.0  '), (source) => {
        const parsed = parseQueryLength(source);
        expect(parsed).toEqual({ value: 0, unit: 'zero' });
        expect(Object.is(parsed!.value, -0)).toBe(false);
      }),
      { seed: 0x5eed_1702, numRuns: 50 },
    );
  });

  test('rejects negative, non-finite, unitless non-zero, foreign, and malformed lengths', () => {
    fc.assert(
      fc.property(invalidLengthArb, (source) => {
        expect(parseQueryLength(source)).toBeNull();
      }),
      { seed: 0x5eed_1703, numRuns: 300 },
    );
  });
});

describe('query-length adapter laws', () => {
  test('invalid lengths refuse each adapter transaction before host resolution', () => {
    fc.assert(
      fc.property(invalidLengthArb, (source) => {
        let resolverCalls = 0;
        const media = fromMediaQueries(`@media (min-width: ${source}) { .x {} }`, {
          resolveLengthInput: () => {
            resolverCalls++;
            return 'custom:invalid.media';
          },
        });
        const tailwind = fromTailwindTheme(`@theme { --breakpoint-test: ${source}; }`, {
          resolveLengthInput: () => {
            resolverCalls++;
            return 'custom:invalid.tailwind';
          },
        });
        const container = fromContainerQueries(`@container (min-width: ${source}) { .x {} }`, {
          resolveInput: () => {
            resolverCalls++;
            return 'custom:invalid.container';
          },
        });

        for (const result of [media, tailwind, container]) {
          expect(result.boundaries).toEqual([]);
          expect(result.tokens).toEqual([]);
          expect(result.themes).toEqual([]);
          expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
        }
        expect(resolverCalls).toBe(0);
      }),
      { seed: 0x5eed_1704, numRuns: 200 },
    );
  });

  test('px thresholds preserve the source predicate across all three adapters', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (threshold) => {
        const media = fromMediaQueries(`@media (min-width: ${threshold}px) { .x {} }`);
        const tailwind = fromTailwindTheme(`@theme { --breakpoint-test: ${threshold}px; }`);
        const container = fromContainerQueries(`@container (min-width: ${threshold}px) { .x {} }`, {
          resolveInput: ({ axis, unit }) => `custom:container.${axis}.${unit}`,
        });

        for (const result of [media, tailwind, container]) {
          expect(result.diagnostics).toEqual([]);
          expect(result.boundaries).toHaveLength(1);
          expect([...result.boundaries[0]!.thresholds]).toEqual([0, threshold]);
          expectThresholdPredicate(result.boundaries[0]!, threshold);
        }
      }),
      { seed: 0x5eed_1705, numRuns: 200 },
    );
  });

  test('relative thresholds preserve their authored unit and numeric edge', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.constantFrom('em' as const, 'rem' as const),
        (threshold, unit) => {
          const media = fromMediaQueries(`@media (min-width: ${threshold}${unit}) { .x {} }`, {
            resolveLengthInput: ({ axis, unit: authoredUnit }) => `custom:media.${axis}.${authoredUnit}`,
          });
          const tailwind = fromTailwindTheme(`@theme { --breakpoint-test: ${threshold}${unit}; }`, {
            resolveLengthInput: ({ axis, unit: authoredUnit }) => `custom:tailwind.${axis}.${authoredUnit}`,
          });
          const container = fromContainerQueries(`@container (min-width: ${threshold}${unit}) { .x {} }`, {
            resolveInput: ({ axis, unit: authoredUnit }) => `custom:container.${axis}.${authoredUnit}`,
          });

          expect(media.boundaries[0]!.input).toBe(`custom:media.width.${unit}`);
          expect(tailwind.boundaries[0]!.input).toBe(`custom:tailwind.width.${unit}`);
          expect(container.boundaries[0]!.input).toBe(`custom:container.width.${unit}`);
          for (const result of [media, tailwind, container]) {
            expect(result.diagnostics).toEqual([]);
            expect([...result.boundaries[0]!.thresholds]).toEqual([0, threshold]);
            expectThresholdPredicate(result.boundaries[0]!, threshold);
          }
        },
      ),
      { seed: 0x5eed_1706, numRuns: 200 },
    );
  });
});

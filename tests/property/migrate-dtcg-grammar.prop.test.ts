/**
 * Declared-grammar properties for the supported DTCG 2025.10 scalar subset.
 *
 * These properties keep the accepted token/group shape, scalar decoders, and
 * refusal transactions aligned. Expected CSS values are derived directly from
 * generated source values rather than by calling adapter helpers.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { fromDesignTokens } from '@liteship/compiler/migrate';
import { DTCG_FORMAT_VERSION, DTCG_MIGRATION_GRAMMAR } from '../../packages/compiler/src/migrate/from-design-tokens.js';

interface ScalarCase {
  readonly type: string;
  readonly value: unknown;
  readonly expected: string | number;
  readonly category: string;
}

const identifierArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/);
const finiteIntegerArb = fc.integer({ min: -100_000, max: 100_000 });

/** Independent oracle for the adapter's length-delimited nested-path projection. */
function encodedNestedTokenName(group: string, token: string): string {
  return `dtcg-path-${group.length}-${group}-${token.length}-${token}`;
}

const scalarCaseArb: fc.Arbitrary<ScalarCase> = fc.oneof(
  fc.tuple(finiteIntegerArb, fc.constantFrom('px' as const, 'rem' as const)).map(([value, unit]) => ({
    type: 'dimension',
    value: { value, unit },
    expected: `${value}${unit}`,
    category: 'spacing',
  })),
  fc.tuple(fc.integer({ min: 0, max: 100_000 }), fc.constantFrom('ms' as const, 's' as const)).map(([value, unit]) => ({
    type: 'duration',
    value: { value, unit },
    expected: `${value}${unit}`,
    category: 'animation',
  })),
  fc.tuple(identifierArb, identifierArb).map(([first, second]) => {
    const family = `${first} ${second}`;
    return { type: 'fontFamily', value: family, expected: JSON.stringify(family), category: 'typography' };
  }),
  fc.integer({ min: 1, max: 1000 }).map((value) => ({
    type: 'fontWeight',
    value,
    expected: value,
    category: 'typography',
  })),
  fc
    .tuple(
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: -500, max: 500 }),
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: -500, max: 500 }),
    )
    .map(([x1, y1, x2, y2]) => {
      const value = [x1 / 100, y1 / 100, x2 / 100, y2 / 100];
      return {
        type: 'cubicBezier',
        value,
        expected: `cubic-bezier(${value.join(', ')})`,
        category: 'animation',
      };
    }),
  finiteIntegerArb.map((value) => ({ type: 'number', value, expected: value, category: 'effect' })),
  fc
    .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }))
    .map(([red, green, blue]) => {
      const components = [red / 100, green / 100, blue / 100];
      return {
        type: 'color',
        value: { colorSpace: 'srgb', components },
        expected: `color(srgb ${components.join(' ')})`,
        category: 'color',
      };
    }),
);

const invalidScalarCaseArb = fc.oneof(
  fc.constant({ type: 'dimension', value: { value: 8, unit: 'em' } }),
  fc.constant({ type: 'dimension', value: { value: 8, unit: 'px', ignored: true } }),
  fc.constant({ type: 'duration', value: { value: 100, unit: 'px' } }),
  fc.constant({ type: 'duration', value: { value: Number.POSITIVE_INFINITY, unit: 'ms' } }),
  fc.integer({ min: 1001, max: 100_000 }).map((value) => ({ type: 'fontWeight', value })),
  fc.constant({ type: 'fontFamily', value: [] }),
  fc.constant({ type: 'cubicBezier', value: [-0.01, 0, 0.5, 1] }),
  fc.constant({ type: 'cubicBezier', value: [0, 0, 1] }),
  fc.constant({ type: 'number', value: '1' }),
  fc.constant({ type: 'number', value: Number.NaN }),
  fc.constant({ type: 'color', value: { colorSpace: 'unknown', components: [0, 0, 0] } }),
  fc.constant({ type: 'color', value: { colorSpace: 'srgb', components: [0, 0, 0], ignored: true } }),
);

describe('DTCG declared grammar', () => {
  test('the supported subset declaration is frozen and revision-pinned', () => {
    expect(DTCG_MIGRATION_GRAMMAR.format).toBe(DTCG_FORMAT_VERSION);
    expect(DTCG_MIGRATION_GRAMMAR.recognizedTypes).toEqual([
      'color',
      'dimension',
      'fontFamily',
      'fontWeight',
      'typography',
      'shadow',
      'borderRadius',
      'duration',
      'cubicBezier',
      'number',
    ]);
    expect(DTCG_MIGRATION_GRAMMAR.scalarTypes).toEqual([
      'color',
      'dimension',
      'fontFamily',
      'fontWeight',
      'duration',
      'cubicBezier',
      'number',
    ]);
    expect(DTCG_MIGRATION_GRAMMAR.refusedCompositeTypes).toEqual(['typography', 'shadow', 'borderRadius']);
    expect(DTCG_MIGRATION_GRAMMAR.names).toEqual({
      nonEmpty: true,
      forbiddenPrefix: '$',
      forbiddenCharacters: ['{', '}', '.'],
    });
    expect(DTCG_MIGRATION_GRAMMAR.dimensionUnits).toEqual(['px', 'rem']);
    expect(DTCG_MIGRATION_GRAMMAR.durationUnits).toEqual(['ms', 's']);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.recognizedTypes)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.scalarTypes)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.refusedCompositeTypes)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.names)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.names.forbiddenCharacters)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.tokenMembers)).toBe(true);
    expect(Object.isFrozen(DTCG_MIGRATION_GRAMMAR.groupMembers)).toBe(true);
  });

  test('supported scalar tokens lower to the independently serialized value', () => {
    fc.assert(
      fc.property(identifierArb, identifierArb, scalarCaseArb, (group, token, scalar) => {
        const result = fromDesignTokens({
          [group]: { [token]: { $type: scalar.type, $value: scalar.value } },
        });

        expect(result.boundaries).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        const expectedName = encodedNestedTokenName(group, token);
        expect(result.tokens[0]).toEqual(
          expect.objectContaining({
            name: expectedName,
            cssProperty: `--liteship-${expectedName}`,
            category: scalar.category,
            fallback: scalar.expected,
          }),
        );
      }),
      { seed: 0x5eed_1711, numRuns: 400 },
    );
  });

  test('valid group metadata and inherited type preserve the scalar result', () => {
    fc.assert(
      fc.property(identifierArb, identifierArb, scalarCaseArb, (group, token, scalar) => {
        const result = fromDesignTokens({
          [group]: {
            $type: scalar.type,
            $description: 'generated group',
            $extensions: { 'org.liteship.test': true },
            $deprecated: false,
            [token]: {
              $value: scalar.value,
              $description: 'generated token',
              $extensions: { 'org.liteship.test': true },
              $deprecated: 'use the replacement',
            },
          },
        });

        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0]!.fallback).toEqual(scalar.expected);
      }),
      { seed: 0x5eed_1712, numRuns: 300 },
    );
  });
});

describe('DTCG refusal transactions', () => {
  test('invalid scalar shapes emit an error and no definition', () => {
    fc.assert(
      fc.property(invalidScalarCaseArb, ({ type, value }) => {
        const result = fromDesignTokens({ token: { $type: type, $value: value } });
        expect(result.boundaries).toEqual([]);
        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
      }),
      { seed: 0x5eed_1713, numRuns: 250 },
    );
  });

  test('foreign token members refuse the token instead of being dropped by struct decoding', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          identifierArb.filter((key) => !key.startsWith('$')),
          fc.constant('$foreign'),
        ),
        (foreignMember) => {
          const result = fromDesignTokens({
            token: {
              $type: 'color',
              $value: { colorSpace: 'srgb', components: [1, 0, 0] },
              [foreignMember]: { authored: true },
            },
          });

          expect(result.tokens).toEqual([]);
          expect(result.themes).toEqual([]);
          expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ severity: 'error', path: ['token', foreignMember] }),
          );
        },
      ),
      { seed: 0x5eed_1714, numRuns: 200 },
    );
  });

  test('ambiguous token and group names emit an error and no definition', () => {
    const invalidNameArb = fc.oneof(
      fc.constant(''),
      identifierArb.map((name) => `$${name}`),
      fc.tuple(identifierArb, identifierArb).map(([left, right]) => `${left}.${right}`),
      identifierArb.map((name) => `{${name}`),
      identifierArb.map((name) => `${name}}`),
    );

    fc.assert(
      fc.property(invalidNameArb, (name) => {
        const tokenResult = fromDesignTokens({
          [name]: { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 0, 0] } },
        });
        const groupResult = fromDesignTokens({
          [name]: {
            token: { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 0, 0] } },
          },
        });

        for (const result of [tokenResult, groupResult]) {
          expect(result.tokens).toEqual([]);
          expect(result.themes).toEqual([]);
          expect(result.diagnostics).toContainEqual(expect.objectContaining({ severity: 'error' }));
        }
      }),
      { seed: 0x5eed_1717, numRuns: 200 },
    );
  });

  test('invalid group metadata refuses the complete group atomically', () => {
    const invalidMetadataArb = fc.constantFrom<readonly [string, unknown]>(
      ['$type', 42],
      ['$type', 'unsupported-type'],
      ['$description', ['not', 'text']],
      ['$extensions', 'not-an-object'],
      ['$deprecated', 42],
      ['$foreign', true],
    );

    fc.assert(
      fc.property(identifierArb, invalidMetadataArb, (group, [member, value]) => {
        const result = fromDesignTokens({
          [group]: {
            [member]: value,
            token: { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 0, 0] } },
          },
        });

        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({ severity: 'error', path: [group, member] }),
        );
      }),
      { seed: 0x5eed_1715, numRuns: 200 },
    );
  });

  test('one invalid mode value refuses the complete mode token', () => {
    fc.assert(
      fc.property(finiteIntegerArb, fc.constantFrom('em', 'vh', 'percent'), (validValue, invalidUnit) => {
        const result = fromDesignTokens({
          gap: {
            $type: 'dimension',
            $value: {
              light: { value: validValue, unit: 'px' },
              dark: { value: validValue, unit: invalidUnit },
            },
          },
        });

        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({ severity: 'error', path: ['gap', 'dark'] }),
        );
      }),
      { seed: 0x5eed_1716, numRuns: 150 },
    );
  });
});

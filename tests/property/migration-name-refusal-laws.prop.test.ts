/** Injective naming and atomic-refusal properties for migration boundaries. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fromCSSCustomProperties, fromDesignTokens } from '@liteship/compiler/migrate';
import { MIGRATE_CODES } from '../../packages/compiler/src/migrate/diagnostics.js';

const acceptedName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(
    (name) =>
      !name.startsWith('$') &&
      !name.includes('{') &&
      !name.includes('}') &&
      !name.includes('.') &&
      name !== '__proto__' &&
      name !== 'prototype' &&
      name !== 'constructor',
  );

function referenceName(path: readonly string[]): string {
  const semantic = path.at(-1) === '$root' ? path.slice(0, -1) : path;
  if (semantic.length === 0) return 'dtcg-root';
  return `dtcg-path-${semantic
    .map((segment) => {
      const hex = Array.from({ length: segment.length }, (_, index) =>
        segment.charCodeAt(index).toString(16).padStart(4, '0'),
      ).join('');
      return `${segment.length}-${hex}`;
    })
    .join('-')}`;
}

function tokenAt(path: readonly string[], value: unknown = 1): Record<string, unknown> {
  let node: Record<string, unknown> = { $type: 'number', $value: value };
  for (const segment of [...path].reverse()) node = { [segment]: node };
  return node;
}

function diagnosticsAreErrors(result: ReturnType<typeof fromDesignTokens>): boolean {
  return result.diagnostics.length > 0 && result.diagnostics.every((entry) => entry.severity === 'error');
}

describe('DTCG path identity', () => {
  it('projects every accepted top-level name through the same valid ASCII encoding', () => {
    fc.assert(
      fc.property(acceptedName, (name) => {
        const result = fromDesignTokens(tokenAt([name]));
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0]!.name).toBe(referenceName([name]));
        expect(result.tokens[0]!.cssProperty).toBe(`--liteship-${referenceName([name])}`);
        expect(result.tokens[0]!.cssProperty).toMatch(/^--liteship-[a-z0-9-]+$/u);
      }),
      { seed: 0xd7c6_01, numRuns: 500 },
    );
  });

  it('is injective across distinct top-level names, including whitespace and surrogate spellings', () => {
    const adversarial = fc.oneof(
      acceptedName,
      fc.constant('brand accent'),
      fc.constant('brand\taccent'),
      fc.constant('é'),
      fc.constant('e\u0301'),
      fc.constant('\ud800'),
      fc.constant('\ud801'),
      fc.constant('😀'),
    );
    fc.assert(
      fc.property(adversarial, adversarial, (left, right) => {
        fc.pre(left !== right);
        const result = fromDesignTokens({
          ...tokenAt([left], 1),
          ...tokenAt([right], 2),
        });
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(2);
        expect(new Set(result.tokens.map((token) => token.name)).size).toBe(2);
        expect(new Set(result.tokens.map((token) => token.cssProperty)).size).toBe(2);
      }),
      { seed: 0xd7c6_02, numRuns: 400 },
    );
  });

  it('is injective between flat names and nested paths that resemble encoded output', () => {
    fc.assert(
      fc.property(acceptedName, acceptedName, (group, token) => {
        const nestedName = referenceName([group, token]);
        const result = fromDesignTokens({
          [nestedName]: { $type: 'number', $value: 1 },
          [group]: { [token]: { $type: 'number', $value: 2 } },
        });
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(2);
        expect(new Set(result.tokens.map((entry) => entry.name)).size).toBe(2);
      }),
      { seed: 0xd7c6_03, numRuns: 300 },
    );
  });

  it('maps group $root to the containing semantic path and no extra public segment', () => {
    fc.assert(
      fc.property(acceptedName, acceptedName, (outer, inner) => {
        const result = fromDesignTokens({
          [outer]: {
            [inner]: {
              $root: { $type: 'number', $value: 7 },
            },
          },
        });
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens.map((entry) => entry.name)).toEqual([referenceName([outer, inner])]);
      }),
      { seed: 0xd7c6_04, numRuns: 250 },
    );
  });
});

describe('DTCG scalar refusal laws', () => {
  it('accepts negative dimensions and rejects negative durations in both supported units', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: -1 }),
        fc.constantFrom('px', 'rem'),
        fc.constantFrom('ms', 's'),
        (value, dimensionUnit, durationUnit) => {
          const dimension = fromDesignTokens({
            offset: { $type: 'dimension', $value: { value, unit: dimensionUnit } },
          });
          const duration = fromDesignTokens({
            delay: { $type: 'duration', $value: { value, unit: durationUnit } },
          });
          expect(dimension.diagnostics).toEqual([]);
          expect(dimension.tokens[0]!.fallback).toBe(`${value}${dimensionUnit}`);
          expect(duration.tokens).toEqual([]);
          expect(duration.themes).toEqual([]);
          expect(diagnosticsAreErrors(duration)).toBe(true);
        },
      ),
      { seed: 0xd7c6_05, numRuns: 250 },
    );
  });

  it('refuses one negative duration mode transactionally without retaining positive siblings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: -100_000, max: -1 }),
        fc.constantFrom('ms', 's'),
        (positive, negative, unit) => {
          const result = fromDesignTokens({
            duration: {
              $type: 'duration',
              $value: {
                light: { value: positive, unit },
                dark: { value: negative, unit },
              },
            },
          });
          expect(result.tokens).toEqual([]);
          expect(result.themes).toEqual([]);
          expect(diagnosticsAreErrors(result)).toBe(true);
        },
      ),
      { seed: 0xd7c6_06, numRuns: 200 },
    );
  });
});

describe('CSS custom-property name mapping', () => {
  const suffix = fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/u);
  const cssValue = fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/u);

  it('refuses every prefixed/unprefixed collision atomically in either source order', () => {
    fc.assert(
      fc.property(suffix, cssValue, fc.boolean(), (name, value, reverse) => {
        const declarations = reverse
          ? `--liteship-${name}: ${value}; --${name}: other;`
          : `--${name}: ${value}; --liteship-${name}: other;`;
        const result = fromCSSCustomProperties(`:root { ${declarations} }`);
        expect(result.boundaries).toEqual([]);
        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({ code: MIGRATE_CODES.malformedInput, severity: 'error' }),
        );
      }),
      { seed: 0xc55_01, numRuns: 300 },
    );
  });

  it('refuses collisions split across root/theme rules instead of applying cascade precedence', () => {
    fc.assert(
      fc.property(suffix, fc.constantFrom('dark', 'night', 'contrast'), (name, theme) => {
        const result = fromCSSCustomProperties(`
          :root { --${name}: base; }
          html[data-theme="${theme}"] { --liteship-${name}: themed; }
        `);
        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({ code: MIGRATE_CODES.malformedInput, severity: 'error' }),
        );
      }),
      { seed: 0xc55_02, numRuns: 200 },
    );
  });

  it('preserves repeated declarations of the same authored property for ordinary cascade resolution', () => {
    fc.assert(
      fc.property(suffix, cssValue, (name, finalValue) => {
        const result = fromCSSCustomProperties(`
          :root { --${name}: initial; }
          :root { --${name}: ${finalValue}; }
        `);
        expect(result.diagnostics.every((diagnostic) => diagnostic.severity !== 'error')).toBe(true);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0]!.name).toBe(name);
        expect(result.tokens[0]!.fallback).toBe(finalValue.trim());
      }),
      { seed: 0xc55_03, numRuns: 200 },
    );
  });
});

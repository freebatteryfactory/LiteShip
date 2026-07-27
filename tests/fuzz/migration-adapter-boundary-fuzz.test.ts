/** Bounded fuzz campaigns for the no-throw/no-silent-definition migration boundary. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fromCSSCustomProperties, fromDesignTokens } from '@liteship/compiler/migrate';

const hostileScalar = fc.oneof(
  fc.anything({ maxDepth: 4 }),
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY),
  fc.constant(-0),
  fc.constant('\ud800'),
  fc.constant('\udfff'),
);

const hostileName = fc.string({ maxLength: 24 });

function assertResultShape(result: ReturnType<typeof fromDesignTokens>): void {
  expect(Array.isArray(result.boundaries)).toBe(true);
  expect(Array.isArray(result.tokens)).toBe(true);
  expect(Array.isArray(result.themes)).toBe(true);
  expect(Array.isArray(result.diagnostics)).toBe(true);
  for (const diagnostic of result.diagnostics) {
    expect(typeof diagnostic.code).toBe('string');
    expect(typeof diagnostic.message).toBe('string');
    expect(['warning', 'error']).toContain(diagnostic.severity);
  }
}

describe('DTCG hostile boundary', () => {
  it('never throws for a single arbitrary token-shaped record', () => {
    fc.assert(
      fc.property(hostileName, hostileScalar, hostileScalar, (name, type, value) => {
        const result = fromDesignTokens({
          [name]: { $type: type, $value: value },
        });
        assertResultShape(result);
      }),
      { seed: 0xf022_0001, numRuns: 2_000 },
    );
  });

  it('never throws for arbitrary JSON-compatible documents', () => {
    fc.assert(
      fc.property(fc.jsonValue({ maxDepth: 5 }), (value) => {
        const result = fromDesignTokens(value);
        assertResultShape(result);
      }),
      { seed: 0xf022_0002, numRuns: 1_000 },
    );
  });

  it('refuses every non-object root without manufacturing definitions', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.jsonValue())),
        (value) => {
          const result = fromDesignTokens(value);
          expect(result.boundaries).toEqual([]);
          expect(result.tokens).toEqual([]);
          expect(result.themes).toEqual([]);
          expect(result.diagnostics.some((entry) => entry.severity === 'error')).toBe(true);
        },
      ),
      { seed: 0xf022_0003, numRuns: 500 },
    );
  });

  it('refuses every negative duration independently of magnitude and unit', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -Number.MAX_VALUE, max: -Number.MIN_VALUE, noNaN: true }),
        fc.constantFrom('ms', 's'),
        (value, unit) => {
          const result = fromDesignTokens({ delay: { $type: 'duration', $value: { value, unit } } });
          expect(result.tokens).toEqual([]);
          expect(result.themes).toEqual([]);
          expect(result.diagnostics.some((entry) => entry.severity === 'error')).toBe(true);
        },
      ),
      { seed: 0xf022_0004, numRuns: 500 },
    );
  });

  it('preserves every finite negative dimension in each supported unit', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_000, max: -1 }), fc.constantFrom('px', 'rem'), (value, unit) => {
        const result = fromDesignTokens({ offset: { $type: 'dimension', $value: { value, unit } } });
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0]!.fallback).toBe(`${value}${unit}`);
      }),
      { seed: 0xf022_0005, numRuns: 500 },
    );
  });

  it('keeps every emitted CSS property within the ASCII custom-property grammar', () => {
    const acceptedName = hostileName.filter(
      (name) =>
        name.length > 0 &&
        !name.startsWith('$') &&
        !/[{}.]/u.test(name) &&
        name !== '__proto__' &&
        name !== 'prototype' &&
        name !== 'constructor',
    );
    fc.assert(
      fc.property(acceptedName, fc.integer(), (name, value) => {
        const result = fromDesignTokens({ [name]: { $type: 'number', $value: value } });
        expect(result.diagnostics).toEqual([]);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0]!.cssProperty).toMatch(/^--liteship-[a-z0-9-]+$/u);
      }),
      { seed: 0xf022_0006, numRuns: 1_000 },
    );
  });
});

describe('CSS custom-property hostile boundary', () => {
  it('never throws for arbitrary CSS text', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 2_000 }), (css) => {
        const result = fromCSSCustomProperties(css);
        expect(Array.isArray(result.boundaries)).toBe(true);
        expect(Array.isArray(result.tokens)).toBe(true);
        expect(Array.isArray(result.themes)).toBe(true);
        expect(Array.isArray(result.diagnostics)).toBe(true);
      }),
      { seed: 0xf022_0007, numRuns: 2_000 },
    );
  });

  it('refuses normalized-name collisions through comments and whitespace', () => {
    const suffix = fc.stringMatching(/^[a-z][a-z0-9_-]{0,24}$/u);
    const whitespace = fc.constantFrom(' ', '\n', '\t', ' /* separator */ ');
    fc.assert(
      fc.property(suffix, whitespace, fc.boolean(), (name, gap, reverse) => {
        const first = `--${name}: red`;
        const second = `--liteship-${name}: blue`;
        const declarations = reverse ? `${second};${gap}${first};` : `${first};${gap}${second};`;
        const result = fromCSSCustomProperties(`:root { ${declarations} }`);
        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics.some((entry) => entry.severity === 'error')).toBe(true);
      }),
      { seed: 0xf022_0008, numRuns: 800 },
    );
  });

  it('does not mistake collision-shaped text inside comments or strings for a declaration', () => {
    const suffix = fc.stringMatching(/^[a-z][a-z0-9_-]{0,24}$/u);
    fc.assert(
      fc.property(suffix, (name) => {
        const result = fromCSSCustomProperties(`
          /* --${name}: false; --liteship-${name}: false; */
          :root {
            --${name}: "--liteship-${name}: not-a-declaration";
          }
        `);
        expect(result.diagnostics.every((entry) => entry.severity !== 'error')).toBe(true);
        expect(result.tokens).toHaveLength(1);
      }),
      { seed: 0xf022_0009, numRuns: 500 },
    );
  });

  it('keeps a collision atomic when unrelated valid tokens precede or follow it', () => {
    const suffix = fc.stringMatching(/^[a-z][a-z0-9_-]{0,24}$/u);
    fc.assert(
      fc.property(suffix, suffix, fc.boolean(), (collision, unrelated, reverse) => {
        fc.pre(collision !== unrelated);
        const bad = `--${collision}: red; --liteship-${collision}: blue;`;
        const good = `--${unrelated}: 1px;`;
        const result = fromCSSCustomProperties(`:root { ${reverse ? `${bad} ${good}` : `${good} ${bad}`} }`);
        expect(result.tokens).toEqual([]);
        expect(result.themes).toEqual([]);
        expect(result.diagnostics.some((entry) => entry.severity === 'error')).toBe(true);
      }),
      { seed: 0xf022_000a, numRuns: 600 },
    );
  });
});

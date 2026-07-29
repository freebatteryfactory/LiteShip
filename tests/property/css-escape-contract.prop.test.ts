import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { testCssEscape } from '../helpers/css-escape.js';

describe('CSS.escape test-realm contract', () => {
  test('covers browser-significant identifier edges', () => {
    expect(testCssEscape('plain-name')).toBe('plain-name');
    expect(testCssEscape('1st')).toBe('\\31 st');
    expect(testCssEscape('-1st')).toBe('-\\31 st');
    expect(testCssEscape('-')).toBe('\\-');
    expect(testCssEscape('a b#c')).toBe('a\\ b\\#c');
    expect(testCssEscape('\0')).toBe('\uFFFD');
  });

  test('is total, deterministic, and never leaves controls or NULL in selector output', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 256 }), (input) => {
        const first = testCssEscape(input);
        expect(testCssEscape(input)).toBe(first);
        expect(first).not.toContain('\0');
        for (const char of first) {
          const code = char.charCodeAt(0);
          expect(code === 127 || (code >= 1 && code <= 31)).toBe(false);
        }
      }),
      { seed: 0xc55e5ca, numRuns: 256 },
    );
  });
});

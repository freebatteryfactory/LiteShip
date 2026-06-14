/**
 * Theme compiler -- per-tenant theme compilation tests.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { compileTheme } from '@czap/edge';

describe('compileTheme', () => {
  test('empty tokens produce empty rule', () => {
    const result = compileTheme({ tokens: {} });
    expect(result.declarations).toEqual([]);
    expect(result.css).toBe(':root {}');
    expect(result.inlineStyle).toBe('');
  });

  test('compiles string token values', () => {
    const result = compileTheme({
      tokens: { 'color.primary': '#3b82f6' },
    });
    expect(result.declarations).toEqual([{ property: '--czap-color-primary', value: '#3b82f6' }]);
    expect(result.css).toContain('--czap-color-primary: #3b82f6;');
    expect(result.inlineStyle).toContain('--czap-color-primary:#3b82f6');
  });

  test('compiles numeric token values without units', () => {
    const result = compileTheme({
      tokens: { 'spacing.base': 16 },
    });
    expect(result.css).toContain('--czap-spacing-base: 16;');
    expect(result.inlineStyle).toContain('--czap-spacing-base:16');
  });

  test('custom prefix replaces default', () => {
    const result = compileTheme({
      tokens: { bg: 'white' },
      prefix: 'myapp',
    });
    expect(result.css).toContain('--myapp-bg: white;');
  });

  test('token names are sanitized', () => {
    const result = compileTheme({
      tokens: { 'Font Size.Large': '24px' },
    });
    // dots and spaces become hyphens, lowercased
    expect(result.css).toContain('--czap-font-size-large: 24px;');
  });

  test('invalid characters are stripped', () => {
    const result = compileTheme({
      tokens: { 'color@primary!': 'red' },
    });
    // @ and ! are stripped
    expect(result.css).toContain('--czap-colorprimary: red;');
  });

  test('multiple tokens produce correct CSS block', () => {
    const result = compileTheme({
      tokens: {
        'color.primary': '#3b82f6',
        'color.secondary': '#10b981',
        'spacing.sm': 8,
      },
    });
    expect(result.css).toMatch(/^:root \{/);
    expect(result.css).toMatch(/\}$/);
    expect(result.css).toContain('--czap-color-primary: #3b82f6;');
    expect(result.css).toContain('--czap-color-secondary: #10b981;');
    expect(result.css).toContain('--czap-spacing-sm: 8;');
  });

  test('inline style uses semicolons without spaces', () => {
    const result = compileTheme({
      tokens: { a: '1', b: '2' },
    });
    expect(result.inlineStyle).toBe('--czap-a:1;--czap-b:2');
  });

  test('declarations remain the primary structured surface', () => {
    const result = compileTheme({
      tokens: { primary: '#fff', spacing: 16 },
    });

    expect(result.declarations).toEqual([
      { property: '--czap-primary', value: '#fff' },
      { property: '--czap-spacing', value: '16' },
    ]);
  });

  test('rejects unsafe prefixes', () => {
    expect(() =>
      compileTheme({
        tokens: { safe: '1' },
        prefix: 'brand;drop',
      }),
    ).toThrow(/Invalid theme prefix "brand;drop"/);
    expect(() =>
      compileTheme({
        tokens: { safe: '1' },
        prefix: 'brand;drop',
      }),
    ).toThrow(/Fix: use "brand-drop" instead/);
    expect(() =>
      compileTheme({
        tokens: { safe: '1' },
        prefix: 'brand;drop',
      }),
    ).toThrow(/--<prefix>-\* CSS custom property names/);
  });

  test('rejects unsafe CSS token values', () => {
    expect(() =>
      compileTheme({
        tokens: { exploit: 'red;display:block' },
      }),
    ).toThrow(/Unsafe theme token "exploit"/);
    expect(() =>
      compileTheme({
        tokens: { exploit: 'red;display:block' },
      }),
    ).toThrow(/forbidden characters \(;, \{, \}, <, >\)/);
  });

  test('rejects malformed serializer-context values', () => {
    expect(() =>
      compileTheme({
        tokens: { exploit: 'url(https://attacker.example/x);' },
      }),
    ).toThrow(/Unsafe theme token "exploit"/);

    expect(() =>
      compileTheme({
        prefix: 'brand"bad',
        tokens: { safe: '#fff' },
      }),
    ).toThrow(/Fix: use "brand-bad" instead/);
  });
});

// ---------------------------------------------------------------------------
// Error-contract LAWS (wave-3 DX items #107, #108) — pinned as properties.
//
// The implementations already shipped; these guard the *contract* a user
// relies on when a build fails: the error must name the exact offender, and
// the "use X instead" suggestion must itself be usable. Example-based tests
// (above) prove the happy reject; these prove it across the generated domain
// so a refactor of the message-building or sanitization can't silently break
// the locate-the-offender / next-thing-to-type guarantee. See
// memory/testing-philosophy.md (pin LAWS, not implementation).
// ---------------------------------------------------------------------------
describe('compileTheme error contracts (properties)', () => {
  const FORBIDDEN_VALUE_CHARS = [';', '{', '}', '<', '>'] as const;

  // A token name that survives sanitization to a non-empty property — so the
  // value check is actually reached. (Pure ASCII letters always survive.)
  const safeNameArb = fc.stringMatching(/^[a-z]{1,12}$/).filter((s) => s.length > 0);

  test('LAW (#107): a forbidden value names its EXACT offending token, whatever the name', () => {
    fc.assert(
      fc.property(
        safeNameArb,
        // any value guaranteed to contain at least one forbidden char
        fc
          .tuple(fc.string(), fc.constantFrom(...FORBIDDEN_VALUE_CHARS), fc.string())
          .map(([a, bad, b]) => `${a}${bad}${b}`),
        (name, value) => {
          let thrown: unknown;
          try {
            compileTheme({ tokens: { [name]: value } });
          } catch (error) {
            thrown = error;
          }
          // Must reject, and the message must carry the literal token name so a
          // user with hundreds of tokens can locate the one offender.
          expect(thrown).toBeInstanceOf(Error);
          expect((thrown as Error).message).toContain(`"${name}"`);
        },
      ),
    );
  });

  test('LAW (#108): the suggested prefix is itself a VALID prefix — the literal next thing to type', () => {
    // Build prefixes that are guaranteed to contain at least one illegal char,
    // so normalizePrefix rejects and emits a suggestion.
    const illegalChar = fc.constantFrom('@', '!', ';', ' ', '_', '.', '"', '/', 'É', '#');
    const dirtyPrefixArb = fc.tuple(fc.string(), illegalChar, fc.string()).map(([a, bad, b]) => `${a}${bad}${b}`);

    fc.assert(
      fc.property(dirtyPrefixArb, (prefix) => {
        let message: string | undefined;
        try {
          compileTheme({ tokens: { safe: '1' }, prefix });
        } catch (error) {
          message = (error as Error).message;
        }
        if (message === undefined) {
          // The generated prefix happened to be valid after lowercasing
          // (e.g. the illegal char was the only deviation and got normalized);
          // contract only applies to the reject path.
          return true;
        }
        const match = message.match(/Fix: use "([^"]*)" instead/);
        expect(match).not.toBeNull();
        const suggestion = match![1]!;
        // The next thing the user types must actually compile — no second error.
        expect(() => compileTheme({ tokens: { safe: '1' }, prefix: suggestion })).not.toThrow();
        return true;
      }),
    );
  });

  test('LAW: a value with NO forbidden char never throws for a survivable name (no false reject)', () => {
    fc.assert(
      fc.property(
        safeNameArb,
        fc.string().filter((v) => !FORBIDDEN_VALUE_CHARS.some((c) => v.includes(c))),
        (name, value) => {
          // Round-trips cleanly: a benign value is emitted, never rejected.
          const result = compileTheme({ tokens: { [name]: value } });
          expect(result.declarations).toHaveLength(1);
          expect(result.declarations[0]!.value).toBe(value);
        },
      ),
    );
  });
});

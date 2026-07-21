/**
 * `migrate/from-css-custom-properties` — unit tests.
 *
 * Covers the clean lossless lowering for both shapes (a single `:root` set →
 * `defineToken`s; a `:root` + `html[data-theme]` set → one `defineTheme`, exact
 * produced fields asserted), every NEW decomposition branch (the top-level
 * selector reader with comment/string/decoy robustness, the base-first variant
 * ordering, the single-vs-multi variant switch, value→`TokenCategory` inference),
 * teeth for every diagnostic code the adapter can emit, and the pathological path
 * where a `defineToken` throw is caught and surfaced as a `severity:'error'`
 * diagnostic rather than escaping.
 *
 * NOTE: imports through the `@liteship/compiler/migrate` subpath (the dev
 * condition resolves to `src`). The facade re-export of `fromCSSCustomProperties`
 * is added in Phase C, so this suite is authored now and run then.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fromCSSCustomProperties } from '@liteship/compiler/migrate';
import { MIGRATE_CODES } from '@liteship/compiler/migrate';

describe('fromCSSCustomProperties — clean lossless cases', () => {
  it('lowers a single :root set into one defineToken per custom property (no diagnostics)', () => {
    const result = fromCSSCustomProperties(`
      :root {
        --liteship-primary: #ff0000;
        --liteship-gap: 8px;
      }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toHaveLength(2);

    const [primary, gap] = result.tokens;
    expect(primary!._tag).toBe('TokenDef');
    expect(primary!.name).toBe('primary');
    expect(primary!.category).toBe('color');
    expect([...primary!.axes]).toEqual([]);
    expect(primary!.values).toEqual({});
    expect(primary!.fallback).toBe('#ff0000');
    expect(primary!.cssProperty).toBe('--liteship-primary');

    expect(gap!.name).toBe('gap');
    expect(gap!.category).toBe('spacing');
    expect(gap!.fallback).toBe('8px');
    expect(gap!.cssProperty).toBe('--liteship-gap');
  });

  it('lowers :root + html[data-theme] into one defineTheme with exact fields (no diagnostics)', () => {
    const result = fromCSSCustomProperties(`
      :root {
        --liteship-bg: #ffffff;
        --liteship-fg: #000000;
      }
      html[data-theme="dark"] {
        --liteship-bg: #111111;
        --liteship-fg: #eeeeee;
      }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.boundaries).toEqual([]);
    expect(result.themes).toHaveLength(1);

    const theme = result.themes[0]!;
    expect(theme._tag).toBe('ThemeDef');
    expect(theme.name).toBe('theme');
    expect([...theme.variants]).toEqual(['default', 'dark']);
    expect(theme.tokens).toEqual({
      bg: { default: '#ffffff', dark: '#111111' },
      fg: { default: '#000000', dark: '#eeeeee' },
    });
    // Base (:root) is variant 0, so it drives Theme.tap for 'default'.
    expect(theme.meta).toBeUndefined();
  });

  it('honours an explicit themeName option', () => {
    const result = fromCSSCustomProperties(
      `:root { --liteship-a: #fff; } html[data-theme="dark"] { --liteship-a: #000; }`,
      { themeName: 'brand' },
    );
    expect(result.themes[0]!.name).toBe('brand');
  });
});

describe('fromCSSCustomProperties — selector reader (NEW)', () => {
  it('reads only :root rules, ignoring comments, @import, decoy selectors, and braces inside strings', () => {
    const result = fromCSSCustomProperties(`
      @import "base.css";
      /* :root { --liteship-ghost: #ff0000; } */
      .btn { color: red; }
      :root {
        --liteship-accent: #00ff00; /* inline comment */
      }
      .decoy::before { content: "} :root { --liteship-ghost: #000000; "; }
      :root {
        --liteship-extra: #0000ff;
      }
    `);

    // The two real :root blocks merge into the single 'default' variant.
    const names = result.tokens.map((t) => t.name).sort();
    expect(names).toEqual(['accent', 'extra']);
    // The commented-out and string-embedded "ghost" custom property never appears.
    expect(names).not.toContain('ghost');
    expect(result.themes).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('accepts a plain --name custom property (bare inversion) and single-quoted data-theme', () => {
    const result = fromCSSCustomProperties(`:root { --brand: #123456; } html[data-theme='sea'] { --brand: #654321; }`);
    expect(result.themes).toHaveLength(1);
    expect([...result.themes[0]!.variants]).toEqual(['default', 'sea']);
    expect(result.themes[0]!.tokens).toEqual({ brand: { default: '#123456', sea: '#654321' } });
  });
});

describe('fromCSSCustomProperties — variant grouping + single/multi switch (NEW)', () => {
  it('keeps :root as the base variant ordered first, then data-theme variants in first-seen order', () => {
    const result = fromCSSCustomProperties(`
      html[data-theme="dark"] { --liteship-a: #111; }
      :root { --liteship-a: #fff; }
      html[data-theme="hc"] { --liteship-a: #000; }
    `);
    expect([...result.themes[0]!.variants]).toEqual(['default', 'dark', 'hc']);
  });

  it('produces defineTokens (not a theme) when only a single named variant is present', () => {
    const result = fromCSSCustomProperties(`html[data-theme="dark"] { --liteship-a: #111; }`);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]!.name).toBe('a');
    expect(result.tokens[0]!.fallback).toBe('#111');
  });

  it('flags the lost data-theme scope when a lone non-default variant collapses to global tokens', () => {
    const result = fromCSSCustomProperties(`html[data-theme="dark"] { --liteship-bg: #111; }`);
    // Behavior is unchanged (single variant -> tokens is the deliberate design)...
    expect(result.themes).toEqual([]);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]!.fallback).toBe('#111');
    // ...but the scope collapse (dark-only -> global) is now surfaced, not silent.
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.lossyTokenConversion);
    expect(d).toBeDefined();
    expect(d!.message).toContain('dark');
    expect(d!.message).toContain('scope is not preserved');
  });

  it('does NOT flag a lone :root sheet (global tokens are correct there)', () => {
    const result = fromCSSCustomProperties(`:root { --liteship-bg: #111; }`);
    expect(result.tokens).toHaveLength(1);
    expect(result.diagnostics).toEqual([]);
  });
});

describe('fromCSSCustomProperties — category inference (NEW)', () => {
  it('maps value CSS syntax to a TokenCategory (color / spacing / animation) and flags the rest', () => {
    const result = fromCSSCustomProperties(`
      :root {
        --liteship-c: #abcdef;
        --liteship-s: 16px;
        --liteship-d: 200ms;
        --liteship-n: 42;
      }
    `);
    const byName = Object.fromEntries(result.tokens.map((t) => [t.name, t.category]));
    expect(byName).toEqual({ c: 'color', s: 'spacing', d: 'animation', n: 'effect' });

    // The unitless number does not classify — emitted under 'effect' with a diagnostic.
    const unknown = result.diagnostics.filter((d) => d.code === MIGRATE_CODES.unknownTokenCategory);
    expect(unknown).toHaveLength(1);
    expect(unknown[0]!.path).toEqual(['n']);
    expect(unknown[0]!.severity).toBe('warning');
  });
});

describe('fromCSSCustomProperties — diagnostic teeth (every code the adapter emits)', () => {
  it('migrate/unknown-token-category — a value with no classifiable syntax', () => {
    const result = fromCSSCustomProperties(`:root { --liteship-weird: auto; }`);
    expect(result.diagnostics.map((d) => d.code)).toContain(MIGRATE_CODES.unknownTokenCategory);
    // Still lowered (under the 'effect' catch-all) rather than dropped.
    expect(result.tokens[0]!.category).toBe('effect');
    expect(result.tokens[0]!.fallback).toBe('auto');
  });

  it('migrate/lossy-token-conversion — a var()/calc() reference in the token path', () => {
    const result = fromCSSCustomProperties(`:root { --liteship-r: var(--other); }`);
    const lossy = result.diagnostics.filter((d) => d.code === MIGRATE_CODES.lossyTokenConversion);
    expect(lossy).toHaveLength(1);
    expect(lossy[0]!.severity).toBe('warning');
    expect(lossy[0]!.path).toEqual(['r']);
    // Value kept verbatim.
    expect(result.tokens[0]!.fallback).toBe('var(--other)');
  });

  it('migrate/lossy-token-conversion — a var()/calc() reference in the theme path', () => {
    const result = fromCSSCustomProperties(`
      :root { --liteship-a: calc(1rem + 2px); }
      html[data-theme="dark"] { --liteship-a: #111; }
    `);
    const lossy = result.diagnostics.filter((d) => d.code === MIGRATE_CODES.lossyTokenConversion);
    expect(lossy).toHaveLength(1);
    expect(result.themes[0]!.tokens.a).toEqual({ default: 'calc(1rem + 2px)', dark: '#111' });
  });

  it('migrate/incomplete-theme-variant (warning) — a token missing in a variant is filled from base', () => {
    const result = fromCSSCustomProperties(`
      :root { --liteship-a: #fff; --liteship-b: #000; }
      html[data-theme="dark"] { --liteship-a: #111; }
    `);
    const incomplete = result.diagnostics.filter((d) => d.code === MIGRATE_CODES.incompleteThemeVariant);
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]!.severity).toBe('warning');
    expect(incomplete[0]!.path).toEqual(['b', 'dark']);
    // b's missing 'dark' value is filled from its :root base.
    expect(result.themes[0]!.tokens.b).toEqual({ default: '#000', dark: '#000' });
  });

  it('migrate/incomplete-theme-variant (error) — a token with no base value is dropped', () => {
    const result = fromCSSCustomProperties(`
      :root { --liteship-a: #fff; }
      html[data-theme="dark"] { --liteship-a: #111; --liteship-c: #f00; }
    `);
    const dropped = result.diagnostics.filter(
      (d) => d.code === MIGRATE_CODES.incompleteThemeVariant && d.severity === 'error',
    );
    expect(dropped).toHaveLength(1);
    expect(dropped[0]!.path).toEqual(['c']);
    // 'c' (present only in dark, no :root base) is absent from the produced theme.
    expect(Object.keys(result.themes[0]!.tokens)).toEqual(['a']);
  });

  it('migrate/malformed-input — a define* throw is caught and surfaced as severity:error, not thrown', () => {
    let result!: ReturnType<typeof fromCSSCustomProperties>;
    expect(() => {
      // A bare `--liteship-:` yields an empty token name; defineToken rejects it.
      result = fromCSSCustomProperties(`:root { --liteship-: #ffffff; }`);
    }).not.toThrow();

    const malformed = result.diagnostics.filter((d) => d.code === MIGRATE_CODES.malformedInput);
    expect(malformed).toHaveLength(1);
    expect(malformed[0]!.severity).toBe('error');
    expect(malformed[0]!.cause).toBeDefined();
    // The rejected declaration produced no token.
    expect(result.tokens).toEqual([]);
  });
});

describe('fromCSSCustomProperties — degenerate inputs', () => {
  it('returns an empty result for CSS with no recognized custom-property rules', () => {
    const result = fromCSSCustomProperties(`.btn { color: red; } @media (min-width: 1px) { :root { --x: 1; } }`);
    expect(result).toEqual({ boundaries: [], tokens: [], themes: [], diagnostics: [] });
  });

  it('returns an empty result for the empty string', () => {
    expect(fromCSSCustomProperties('')).toEqual({ boundaries: [], tokens: [], themes: [], diagnostics: [] });
  });
});

describe('fromCSSCustomProperties — property: single :root lowering round-trips names and values', () => {
  it('every --liteship-<name>: <value> becomes a defineToken preserving name/value/cssProperty', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            name: fc
              .string({ minLength: 1, maxLength: 8 })
              .map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ''))
              .filter((s) => s.length > 0),
            hex: fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`),
          }),
          { selector: (e) => e.name, minLength: 1, maxLength: 6 },
        ),
        (entries) => {
          const body = entries.map((e) => `  --liteship-${e.name}: ${e.hex};`).join('\n');
          const result = fromCSSCustomProperties(`:root {\n${body}\n}`);

          expect(result.themes).toEqual([]);
          expect(result.tokens).toHaveLength(entries.length);
          for (const e of entries) {
            const tok = result.tokens.find((t) => t.name === e.name);
            expect(tok).toBeDefined();
            expect(tok!.category).toBe('color');
            expect(tok!.fallback).toBe(e.hex);
            expect(tok!.cssProperty).toBe(`--liteship-${e.name}`);
          }
        },
      ),
    );
  });
});

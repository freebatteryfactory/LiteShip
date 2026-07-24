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
import { ThemeCSSCompiler } from '@liteship/compiler';
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
  it('recognizes :root inside a selector list without dropping the base declarations', () => {
    const result = fromCSSCustomProperties(`
      :root, :host { --accent: red; }
      html[data-theme="dark"] { --accent: darkred; }
    `);
    expect(result.themes).toHaveLength(1);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'darkred' });
  });

  it('recognizes selector keywords case-insensitively and ignores structural comments', () => {
    const result = fromCSSCustomProperties(`
      :ROOT /* base */ , :host { --accent: red; }
      HTML /* host */ [DATA-THEME="dark"] { --accent: darkred; }
    `);
    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'darkred' });
  });

  it('does not split a selector-list comma inside a quoted data-theme value', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red; }
      html[data-theme="dark,contrast"] { --accent: black; }
    `);
    expect([...result.themes[0]!.variants]).toEqual(['default', 'dark,contrast']);
  });

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

describe('fromCSSCustomProperties — supported selector cascade', () => {
  it('lets an earlier important base declaration beat a later ordinary declaration', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red !important; }
      html[data-theme="dark"] { --accent: blue; }
    `);

    expect(result.themes[0]!.tokens.accent).toEqual({
      default: 'red !important',
      dark: 'red !important',
    });
  });

  it('uses source order between important declarations', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red !important; }
      [data-theme="dark"] { --accent: blue !IMPORTANT; }
    `);

    expect(result.themes[0]!.tokens.accent).toEqual({
      default: 'red !important',
      dark: 'blue !important',
    });
  });

  it('does not let higher specificity ordinary declarations beat important declarations', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red !important; }
      html[data-theme="dark"] { --accent: blue; }
    `);

    expect(result.themes[0]!.tokens.accent.dark).toBe('red !important');
  });

  it('does not treat important text inside strings or functions as declaration priority', () => {
    const result = fromCSSCustomProperties(`
      :root { --message: var(--fallback, "!important"); }
      :root { --message: ordinary; }
    `);

    expect(result.tokens[0]!.fallback).toBe('ordinary');
  });

  it('parses comments and whitespace between the important marker tokens', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red ! /* priority */ IMPORTANT; }
      :root { --accent: blue; }
    `);

    expect(result.tokens[0]!.fallback).toBe('red !important');
  });

  it('recognizes escaped CSS identifiers in the important priority token', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red !\\69mportant; }
      :root { --accent: blue; }
    `);

    expect(result.tokens[0]!.fallback).toBe('red !important');
  });

  it('retains important priority in compiled theme CSS', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red !important; }
      [data-theme="dark"] { --accent: blue !important; }
    `);
    const compiled = ThemeCSSCompiler.compile(result.themes[0]!);

    expect(compiled.selectors).toContain('--liteship-accent: red !important;');
    expect(compiled.selectors).toContain('--liteship-accent: blue !important;');
  });

  it('lets a later :root declaration beat an earlier bare data-theme declaration at equal specificity', () => {
    const result = fromCSSCustomProperties(`
      [data-theme="dark"] { --accent: darkred; }
      :root { --accent: red; }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'red' });
  });

  it('lets a later bare data-theme declaration beat an earlier :root declaration at equal specificity', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red; }
      [data-theme="dark"] { --accent: darkred; }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'darkred' });
  });

  it('keeps an earlier html[data-theme] declaration over a later :root declaration by specificity', () => {
    const result = fromCSSCustomProperties(`
      html[data-theme="dark"] { --accent: darkred; }
      :root { --accent: red; }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'darkred' });
  });

  it('uses source order for repeated occurrences of the same supported selector', () => {
    const result = fromCSSCustomProperties(`
      :root { --accent: red; }
      [data-theme="dark"] { --accent: darkred; }
      [data-theme="dark"] { --accent: black; }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'black' });
  });

  it('applies selector-list declarations as cascade candidates for every supported member', () => {
    const result = fromCSSCustomProperties(`
      :root, [data-theme="dark"] { --accent: red; }
      :root { --accent: blue; }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'blue', dark: 'blue' });
  });

  it('retains the strongest matching member when a selector list names one variant more than once', () => {
    const result = fromCSSCustomProperties(`
      [data-theme="dark"], html[data-theme="dark"] { --accent: darkred; }
      :root { --accent: red; }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.themes[0]!.tokens.accent).toEqual({ default: 'red', dark: 'darkred' });
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

  it('refuses a single named variant because global tokens cannot preserve its scope', () => {
    const result = fromCSSCustomProperties(`html[data-theme="dark"] { --liteship-a: #111; }`);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.lossyTokenConversion, severity: 'error' }),
    );
  });

  it('does not globalize a lone non-default variant', () => {
    const result = fromCSSCustomProperties(`html[data-theme="dark"] { --liteship-bg: #111; }`);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toEqual([]);
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.lossyTokenConversion);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.message).toContain('dark');
    expect(d!.message).toContain('refused');
  });

  it('does NOT flag a lone :root sheet (global tokens are correct there)', () => {
    const result = fromCSSCustomProperties(`:root { --liteship-bg: #111; }`);
    expect(result.tokens).toHaveLength(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('refuses a named "default" variant that collides with the internal :root base', () => {
    const result = fromCSSCustomProperties(`
      :root { --liteship-bg: white; }
      html[data-theme="default"] { --liteship-bg: black; }
    `);
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.malformedInput, severity: 'error' }),
    );
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

  it('inspects every theme variant so a literal base cannot hide a lossy override', () => {
    const result = fromCSSCustomProperties(`
      :root { --liteship-a: #fff; }
      html[data-theme="dark"] { --liteship-a: var(--dark-a); }
    `);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: MIGRATE_CODES.lossyTokenConversion,
        path: ['a', 'dark'],
      }),
    );
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
    const result = fromCSSCustomProperties(`.btn { color: red; }`);
    expect(result).toEqual({ boundaries: [], tokens: [], themes: [], diagnostics: [] });
  });

  it('refuses scoped custom-property declarations instead of silently widening or dropping them', () => {
    const result = fromCSSCustomProperties(`.card { --accent: red; }`);
    expect(result.boundaries).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: MIGRATE_CODES.unsupportedSelector,
        severity: 'error',
        path: ['.card'],
      }),
    ]);
  });

  it('refuses a mixed supported/scoped selector list atomically', () => {
    const result = fromCSSCustomProperties(`html[data-theme="dark"], .special { --accent: black; }`);
    expect(result.boundaries).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: MIGRATE_CODES.unsupportedSelector,
        severity: 'error',
        path: ['html[data-theme="dark"], .special'],
      }),
    ]);
  });

  it('does not mistake comment/string lookalikes in an unsupported selector for scoped declarations', () => {
    const result = fromCSSCustomProperties(`
      .card {
        /* --comment-token: red; */
        content: "--string-token: blue";
        color: green;
      }
    `);
    expect(result).toEqual({ boundaries: [], tokens: [], themes: [], diagnostics: [] });
  });

  it.each([
    ['layer', '@layer tokens { :root { --accent: red; } }'],
    ['supports', '@supports (color: oklch(0 0 0)) { :root { --accent: oklch(.7 .2 20); } }'],
    ['media', '@media (min-width: 1px) { :root { --accent: red; } }'],
    ['scope', '@scope (.theme) { :root { --accent: red; } }'],
    ['nested wrappers', '@layer tokens { @supports (color: red) { :root { --accent: red; } } }'],
  ])('refuses %s wrappers atomically when they contain custom-property definitions', (_name, css) => {
    const result = fromCSSCustomProperties(css);
    expect(result.boundaries).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    ]);
  });

  it('does not treat comments, strings, or URL payloads as wrapped custom-property definitions', () => {
    const result = fromCSSCustomProperties(`
      @layer utilities {
        /* :root { --comment-token: red; } */
        .demo {
          content: "--string-token: blue";
          background: url(data:text/plain,--url-token:green);
        }
      }
    `);
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

/**
 * `migrate/from-tailwind-theme` — unit tests.
 *
 * Covers the clean lossless lowering (exact produced TokenDef/BoundaryDef
 * fields), every NEW decomposition branch (namespace→category recovery, numeric
 * scale reconstruction with/without a bare fallback, `--breakpoint-*` and
 * `screens`-option folding, statePrefix naming), teeth for every diagnostic code
 * the adapter can emit, and the pathological-input path where a `defineToken`
 * throw is caught and surfaced as a `severity:'error'` diagnostic rather than
 * escaping.
 *
 * NOTE: imports through the `@liteship/compiler/migrate` subpath (the dev
 * condition resolves to `src`). The facade re-export of `fromTailwindTheme` is
 * added in Phase C, so this suite is authored now and run then.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Boundary } from '@liteship/core';
import { fromTailwindTheme } from '@liteship/compiler/migrate';
import { MIGRATE_CODES } from '@liteship/compiler/migrate';

describe('fromTailwindTheme — clean lossless case', () => {
  it('recovers single-value tokens from their namespace prefixes with no diagnostics', () => {
    const result = fromTailwindTheme(`
      @theme {
        --color-primary: #6366f1;
        --spacing-md: 1rem;
      }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toHaveLength(2);

    const [primary, md] = result.tokens;
    expect(primary!._tag).toBe('TokenDef');
    expect(primary!.name).toBe('primary');
    expect(primary!.category).toBe('color');
    expect([...primary!.axes]).toEqual([]);
    expect(primary!.values).toEqual({});
    expect(primary!.fallback).toBe('#6366f1');
    expect(primary!.cssProperty).toBe('--liteship-primary');

    expect(md!.name).toBe('md');
    expect(md!.category).toBe('spacing');
    expect(md!.fallback).toBe('1rem');
  });

  it('accepts a bare declaration body when no @theme at-rule is present', () => {
    const result = fromTailwindTheme(`--radius-lg: 0.5rem; --shadow-sm: 0 1px 2px #0001;`);
    expect(result.diagnostics).toEqual([]);
    const cats = result.tokens.map((t) => `${t.category}:${t.name}`).sort();
    expect(cats).toEqual(['radius:lg', 'shadow:sm']);
  });
});

describe('fromTailwindTheme — token decomposition branches', () => {
  it('reconstructs numeric scale vars into one scale-axis token (fallback = 500 step)', () => {
    const result = fromTailwindTheme(`
      @theme {
        --color-primary-500: #6366f1;
        --color-primary-700: #4338ca;
      }
    `);

    expect(result.tokens).toHaveLength(1);
    const t = result.tokens[0]!;
    expect(t.name).toBe('primary');
    expect(t.category).toBe('color');
    expect([...t.axes]).toEqual(['scale']);
    // Single-axis value keys are the axis value directly (alphabetical join is a no-op).
    expect(t.values).toEqual({ '500': '#6366f1', '700': '#4338ca' });
    // No bare var → fallback prefers the idiomatic 500 step.
    expect(t.fallback).toBe('#6366f1');
    expect(result.diagnostics).toEqual([]);
  });

  it('uses a co-named bare var as the scale token fallback', () => {
    const result = fromTailwindTheme(`
      @theme {
        --color-brand: #000000;
        --color-brand-500: #123456;
      }
    `);
    expect(result.tokens).toHaveLength(1);
    const t = result.tokens[0]!;
    expect(t.name).toBe('brand');
    expect([...t.axes]).toEqual(['scale']);
    expect(t.values).toEqual({ '500': '#123456' });
    expect(t.fallback).toBe('#000000');
  });

  it('keeps tokens of different categories separate even with the same base name', () => {
    const result = fromTailwindTheme(`
      @theme {
        --color-accent: #f00;
        --spacing-accent: 2rem;
      }
    `);
    const pairs = result.tokens.map((t) => `${t.category}:${t.name}`).sort();
    expect(pairs).toEqual(['color:accent', 'spacing:accent']);
  });
});

describe('fromTailwindTheme — screens → viewport.width boundary', () => {
  it('folds --breakpoint-* vars into one ascending boundary', () => {
    const result = fromTailwindTheme(`
      @theme {
        --breakpoint-sm: 640px;
        --breakpoint-lg: 1024px;
      }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.boundaries).toHaveLength(1);

    const b = result.boundaries[0]!;
    expect(b._tag).toBe('BoundaryDef');
    expect(b.input).toBe('viewport.width');
    expect([...b.thresholds]).toEqual([0, 640, 1024]);
    expect([...b.states]).toEqual(['base', 'sm', 'lg']);

    expect(Boundary.evaluate(b, 500)).toBe('base');
    expect(Boundary.evaluate(b, 800)).toBe('sm');
    expect(Boundary.evaluate(b, 1200)).toBe('lg');
  });

  it('resolves rem breakpoints against the 16px root', () => {
    const result = fromTailwindTheme(`@theme { --breakpoint-md: 48rem; }`);
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 768]);
  });

  it('accepts an explicit screens option map', () => {
    const result = fromTailwindTheme(`@theme { --color-x: red; }`, { screens: { md: '768px' } });
    const b = result.boundaries[0]!;
    expect([...b.thresholds]).toEqual([0, 768]);
    expect([...b.states]).toEqual(['base', 'md']);
  });

  it('honours an explicit statePrefix for screen state names', () => {
    const result = fromTailwindTheme(`@theme { --breakpoint-md: 768px; }`, { statePrefix: 'bp' });
    const b = result.boundaries[0]!;
    expect([...b.states]).toEqual(['bp-0', 'bp-768']);
    expect([...b.thresholds]).toEqual([0, 768]);
  });
});

describe('fromTailwindTheme — every diagnostic code has teeth', () => {
  it('emits unknown-token-category for a var outside the known namespaces', () => {
    const result = fromTailwindTheme(`@theme { --text-lg: 1.125rem; }`);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unknownTokenCategory)).toBe(true);
    // The unclassifiable var produced no token.
    expect(result.tokens).toEqual([]);
  });

  it('emits lossy-token-conversion for a var()/calc() reference value', () => {
    const result = fromTailwindTheme(`@theme { --color-accent: var(--color-primary-500); }`);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.lossyTokenConversion)).toBe(true);
    // Still kept the token verbatim (lossy-but-usable, warning severity).
    const accent = result.tokens.find((t) => t.name === 'accent');
    expect(accent!.fallback).toBe('var(--color-primary-500)');
    expect(result.diagnostics.find((d) => d.code === MIGRATE_CODES.lossyTokenConversion)!.severity).toBe('warning');
  });

  it('emits unsupported-at-rule for a screen value that is not a supported length', () => {
    // `40vw` (and any non px/rem/em value) cannot become a threshold; the screen
    // is dropped, and per the no-silent-drift contract that drop is surfaced.
    const result = fromTailwindTheme(`@theme { --breakpoint-sm: 640px; --breakpoint-wide: 40vw; }`);
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.unsupportedAtRule);
    expect(d).toBeDefined();
    expect(d!.message).toContain('wide');
    expect(d!.message).toContain('40vw');
    // The parseable screen still folds into the boundary; only `wide` was dropped.
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 640]);
    expect([...result.boundaries[0]!.states]).toEqual(['base', 'sm']);
  });

  it('also diagnoses an unsupported value supplied through the screens option', () => {
    const result = fromTailwindTheme(`@theme { --color-x: red; }`, { screens: { huge: '100%' } });
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });

  it('emits non-ascending-thresholds when screens are out of source order', () => {
    const result = fromTailwindTheme(`
      @theme {
        --breakpoint-lg: 1024px;
        --breakpoint-sm: 640px;
      }
    `);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(true);
    // Sorted before construction — the boundary is still strictly ascending.
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 640, 1024]);
  });
});

describe('fromTailwindTheme — pathological input is caught, not thrown', () => {
  it('surfaces a defineToken ValidationError as a severity:error diagnostic', () => {
    // `--color-` strips to an EMPTY token name; defineToken's name gate rejects it.
    let result!: ReturnType<typeof fromTailwindTheme>;
    expect(() => {
      result = fromTailwindTheme(`@theme { --color-: #ffffff; }`);
    }).not.toThrow();

    // No token was produced (the whole declaration was dropped)...
    expect(result.tokens).toEqual([]);
    // ...and the failure is an error-severity diagnostic carrying the cause.
    const err = result.diagnostics.find((d) => d.severity === 'error');
    expect(err).toBeDefined();
    expect(err!.code).toBe(MIGRATE_CODES.lossyTokenConversion);
    expect(err!.cause).toBeDefined();
  });

  it('surfaces a non-finite screen length as a caught severity:error diagnostic', () => {
    // 1e400px parses to a non-finite threshold; defineBoundary's gate rejects it.
    let result!: ReturnType<typeof fromTailwindTheme>;
    expect(() => {
      result = fromTailwindTheme(`@theme { --breakpoint-huge: 1e400px; }`);
    }).not.toThrow();
    expect(result.boundaries).toEqual([]);
    const err = result.diagnostics.find((d) => d.severity === 'error');
    expect(err).toBeDefined();
    expect(err!.cause).toBeDefined();
  });
});

describe('fromTailwindTheme — property: ascending screen sets fold losslessly', () => {
  it('produces [0, ...sortedBreakpoints] with no ordering diagnostics', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.integer({ min: 1, max: 5000 }), { minLength: 1, maxLength: 6 })
          .map((xs) => [...xs].sort((a, b) => a - b)),
        (bps) => {
          const body = bps.map((bp, i) => `--breakpoint-s${i}: ${bp}px;`).join('\n');
          const result = fromTailwindTheme(`@theme { ${body} }`);
          const b = result.boundaries[0]!;
          expect([...b.thresholds]).toEqual([0, ...bps]);
          expect(b.states).toHaveLength(bps.length + 1);
          expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });
});

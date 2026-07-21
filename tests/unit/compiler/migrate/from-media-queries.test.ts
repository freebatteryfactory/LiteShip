/**
 * `migrate/from-media-queries` — unit tests.
 *
 * Covers the clean lossless lowering (exact produced defs), every NEW
 * decomposition branch (min/max-width folding, ascending/dedupe, height axis,
 * prefers-color-scheme → theme, discrete → media:/custom: boundary), teeth for
 * every diagnostic code the adapter can emit, and the pathological-input path
 * where a `define*` throw is caught and surfaced as a `severity:'error'`
 * diagnostic rather than escaping.
 *
 * NOTE: imports through the `@liteship/compiler/migrate` subpath (the dev
 * condition resolves to `src`). The facade re-export of `fromMediaQueries` is
 * added in Phase C, so this suite is authored now and run then.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Boundary } from '@liteship/core';
import { fromMediaQueries } from '@liteship/compiler/migrate';
import { MIGRATE_CODES } from '@liteship/compiler/migrate';

describe('fromMediaQueries — clean lossless case', () => {
  it('folds ascending min-width blocks into one viewport.width boundary with no diagnostics', () => {
    const result = fromMediaQueries(`
      .card { padding: 1rem; }
      @media (min-width: 768px)  { .card { padding: 2rem; } }
      @media (min-width: 1280px) { .card { padding: 4rem; } }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.boundaries).toHaveLength(1);

    const b = result.boundaries[0]!;
    expect(b._tag).toBe('BoundaryDef');
    expect(b.input).toBe('viewport.width');
    expect([...b.thresholds]).toEqual([0, 768, 1280]);
    // Default naming reuses the shared VIEWPORT labels; 0 → 'base'.
    expect([...b.states]).toEqual(['base', 'tablet', 'desktop']);

    // Round-trip semantics: the width that wins each state.
    expect(Boundary.evaluate(b, 500)).toBe('base');
    expect(Boundary.evaluate(b, 800)).toBe('tablet');
    expect(Boundary.evaluate(b, 1400)).toBe('desktop');
  });

  it('honours an explicit statePrefix', () => {
    const result = fromMediaQueries(`@media (min-width: 768px) { .x { a: b; } }`, { statePrefix: 'bp' });
    const b = result.boundaries[0]!;
    expect([...b.states]).toEqual(['bp-0', 'bp-768']);
    expect([...b.thresholds]).toEqual([0, 768]);
  });
});

describe('fromMediaQueries — decomposition branches', () => {
  it('max-width folds to the strict threshold T+1 (inclusive → exclusive)', () => {
    const result = fromMediaQueries(`@media (max-width: 767px) { .x { a: b; } }`);
    const b = result.boundaries[0]!;
    expect(b.input).toBe('viewport.width');
    expect([...b.thresholds]).toEqual([0, 768]);
    expect(result.diagnostics).toEqual([]);
  });

  it('resolves rem breakpoints against the 16px root', () => {
    const result = fromMediaQueries(`@media (min-width: 48rem) { .x { a: b; } }`);
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 768]);
  });

  it('routes *-height features to a viewport.height boundary', () => {
    const result = fromMediaQueries(`@media (min-height: 600px) { .x { a: b; } }`);
    const b = result.boundaries[0]!;
    expect(b.input).toBe('viewport.height');
    expect([...b.thresholds]).toEqual([0, 600]);
  });

  it('emits both a width and a height boundary when both axes appear', () => {
    const result = fromMediaQueries(`
      @media (min-width: 768px)  { .x { a: b; } }
      @media (min-height: 600px) { .x { a: b; } }
    `);
    const inputs = result.boundaries.map((b) => b.input).sort();
    expect(inputs).toEqual(['viewport.height', 'viewport.width']);
  });

  it('sorts non-ascending source-order breakpoints and flags it', () => {
    const result = fromMediaQueries(`
      @media (min-width: 1280px) { .x { a: b; } }
      @media (min-width: 768px)  { .x { a: b; } }
    `);
    const b = result.boundaries[0]!;
    expect([...b.thresholds]).toEqual([0, 768, 1280]); // strictly ascending
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(true);
    // Not a duplicate case.
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(false);
  });

  it('collapses duplicate breakpoints and flags it', () => {
    const result = fromMediaQueries(`
      @media (min-width: 768px) { .x { a: b; } }
      @media (min-width: 768px) { .y { c: d; } }
    `);
    const b = result.boundaries[0]!;
    expect([...b.thresholds]).toEqual([0, 768]);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(true);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(false);
  });

  it('lowers prefers-color-scheme into a light/dark theme with :root as light defaults', () => {
    const result = fromMediaQueries(`
      :root { --bg: #ffffff; --fg: #000000; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #111111; --fg: #eeeeee; }
      }
    `);

    // No boundary — prefers-color-scheme is theme-shaped, not signal-shaped.
    expect(result.boundaries).toEqual([]);
    expect(result.themes).toHaveLength(1);

    const t = result.themes[0]!;
    expect(t._tag).toBe('ThemeDef');
    expect(t.name).toBe('migrated-color-scheme');
    expect([...t.variants]).toEqual(['light', 'dark']);
    expect(t.tokens).toEqual({
      bg: { light: '#ffffff', dark: '#111111' },
      fg: { light: '#000000', dark: '#eeeeee' },
    });
    expect(t.meta).toEqual({
      light: { label: 'Light', mode: 'light' },
      dark: { label: 'Dark', mode: 'dark' },
    });
  });

  it('cross-fills a dark-only token so the theme stays complete (no throw)', () => {
    const result = fromMediaQueries(`
      @media (prefers-color-scheme: dark) { :root { --accent: #f90; } }
    `);
    const t = result.themes[0]!;
    // accent has no light source → light reuses the dark value.
    expect(t.tokens.accent).toEqual({ light: '#f90', dark: '#f90' });
  });

  it('keeps a recognized discrete feature as a media: boundary and flags it unmappable', () => {
    const result = fromMediaQueries(`
      @media (prefers-reduced-motion: reduce) { .x { animation: none; } }
    `);
    const b = result.boundaries[0]!;
    expect(b.input).toBe('media:(prefers-reduced-motion: reduce)');
    expect([...b.states]).toEqual(['prefers-reduced-motion-off', 'prefers-reduced-motion-on']);
    expect([...b.thresholds]).toEqual([0, 1]);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unmappableMediaFeature)).toBe(true);
  });

  it('keeps an unrecognized discrete feature as a custom: boundary', () => {
    const result = fromMediaQueries(`@media (monochrome) { .x { a: b; } }`);
    const b = result.boundaries[0]!;
    expect(b.input).toBe('custom:(monochrome)');
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unmappableMediaFeature)).toBe(true);
  });

  it('deduplicates repeated discrete features into a single boundary', () => {
    const result = fromMediaQueries(`
      @media (prefers-reduced-motion: reduce) { .a { x: 1; } }
      @media (prefers-reduced-motion: reduce) { .b { y: 2; } }
    `);
    const motionBoundaries = result.boundaries.filter((b) => b.input.startsWith('media:'));
    expect(motionBoundaries).toHaveLength(1);
  });
});

describe('fromMediaQueries — every diagnostic code has teeth', () => {
  it('emits unmappable-media-feature', () => {
    const { diagnostics } = fromMediaQueries(`@media (prefers-contrast: more) { .x { a: b; } }`);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.unmappableMediaFeature)).toBe(true);
  });

  it('emits non-ascending-thresholds', () => {
    const { diagnostics } = fromMediaQueries(`
      @media (min-width: 900px) { .x { a: b; } }
      @media (min-width: 400px) { .x { a: b; } }
    `);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(true);
  });

  it('emits ambiguous-breakpoint', () => {
    const { diagnostics } = fromMediaQueries(`
      @media (min-width: 500px) { .x { a: b; } }
      @media (min-width: 500px) { .y { c: d; } }
    `);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(true);
  });

  it('emits unsupported-at-rule for a non-@media at-rule', () => {
    const { diagnostics } = fromMediaQueries(`@supports (display: grid) { .x { display: grid; } }`);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });

  it('emits unsupported-at-rule for a bare media-type query', () => {
    const { diagnostics } = fromMediaQueries(`@media print { .x { color: black; } }`);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });
});

describe('fromMediaQueries — pathological input is caught, not thrown', () => {
  it('surfaces a constructor ValidationError as a severity:error diagnostic', () => {
    // 1e400px parses to a NON-finite length; defineBoundary's ThresholdValue
    // gate rejects it. The adapter must catch the throw, not propagate it.
    let result!: ReturnType<typeof fromMediaQueries>;
    expect(() => {
      result = fromMediaQueries(`@media (min-width: 1e400px) { .x { a: b; } }`);
    }).not.toThrow();

    // No boundary was produced (the whole width fold was dropped)...
    expect(result.boundaries).toEqual([]);
    // ...and the failure is an error-severity diagnostic carrying the cause.
    const err = result.diagnostics.find((d) => d.severity === 'error');
    expect(err).toBeDefined();
    expect(err!.code).toBe(MIGRATE_CODES.unsupportedAtRule);
    expect(err!.cause).toBeDefined();
  });
});

describe('fromMediaQueries — property: ascending min-width sets fold losslessly', () => {
  it('produces [0, ...sortedBreakpoints] with no ordering diagnostics', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.integer({ min: 1, max: 5000 }), { minLength: 1, maxLength: 6 })
          .map((xs) => [...xs].sort((a, b) => a - b)),
        (bps) => {
          const css = bps.map((bp) => `@media (min-width: ${bp}px) { .x { a: b; } }`).join('\n');
          const result = fromMediaQueries(css);
          const b = result.boundaries[0]!;

          expect([...b.thresholds]).toEqual([0, ...bps]);
          expect(b.states).toHaveLength(bps.length + 1);
          // Already ascending + unique in source → no ordering diagnostics.
          expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(false);
          expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });
});

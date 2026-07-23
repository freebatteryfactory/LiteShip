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
  it('refuses max-width instead of approximating a finite upper bound', () => {
    const result = fromMediaQueries(`@media (max-width: 767px) { .x { a: b; } }`);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
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

  it('refuses non-ascending source-order breakpoints instead of reordering cascade', () => {
    const result = fromMediaQueries(`
      @media (min-width: 1280px) { .x { a: b; } }
      @media (min-width: 768px)  { .x { a: b; } }
    `);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(true);
    // Not a duplicate case.
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(false);
  });

  it('refuses duplicate breakpoints instead of collapsing cascade identity', () => {
    const result = fromMediaQueries(`
      @media (min-width: 768px) { .x { a: b; } }
      @media (min-width: 768px) { .y { c: d; } }
    `);
    expect(result.boundaries).toEqual([]);
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
    expect(t.meta).toBeUndefined();
  });

  it('preserves source-order cascade when a later :root overrides an earlier scheme rule', () => {
    const result = fromMediaQueries(`
      @media (prefers-color-scheme: dark) { :root { --bg: #111111; } }
      :root { --bg: #ffffff; }
    `);
    expect(result.themes[0]!.tokens.bg).toEqual({ light: '#ffffff', dark: '#ffffff' });
  });

  it('preserves source-order cascade when a later scheme rule overrides the shared root', () => {
    const result = fromMediaQueries(`
      :root { --bg: #ffffff; }
      @media (prefers-color-scheme: dark) { :root { --bg: #111111; } }
    `);
    expect(result.themes[0]!.tokens.bg).toEqual({ light: '#ffffff', dark: '#111111' });
  });

  it('cross-fills a dark-only token so the theme stays complete (no throw)', () => {
    const result = fromMediaQueries(`
      @media (prefers-color-scheme: dark) { :root { --accent: #f90; } }
    `);
    const t = result.themes[0]!;
    // accent has no light source → light reuses the dark value.
    expect(t.tokens.accent).toEqual({ light: '#f90', dark: '#f90' });
  });

  it('harvests only :root custom properties as theme tokens (scoped selectors stay scoped)', () => {
    const result = fromMediaQueries(`
      :root { --bg: #fff; }
      .card { --accent: red; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #111; }
        .card { --accent: darkred; }
      }
    `);
    const t = result.themes[0]!;
    // Only :root's --bg is a theme token; .card's scoped --accent is excluded
    // from BOTH the light defaults and the dark variant (no scope widening).
    expect(t.tokens).toEqual({ bg: { light: '#fff', dark: '#111' } });
    expect(Object.keys(t.tokens)).not.toContain('accent');
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

  it.each([
    ['prefers-color-scheme', 'light', 'dark'],
    ['orientation', 'portrait', 'landscape'],
    ['prefers-reduced-motion', 'reduce', 'no-preference'],
    ['pointer', 'fine', 'coarse'],
    ['hover', 'hover', 'none'],
    ['prefers-contrast', 'more', 'less'],
    ['forced-colors', 'active', 'none'],
  ])('refuses contradictory closed values for %s before emitting any definition', (feature, left, right) => {
    const result = fromMediaQueries(`
      @media (${feature}: ${left}) and (${feature}: ${right}) {
        :root { --accent: red; }
        .x { display: block; }
      }
    `);

    expect(result.boundaries).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.tokens).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: MIGRATE_CODES.unsupportedAtRule,
        severity: 'error',
        path: ['@media', `(${feature}: ${left}) and (${feature}: ${right})`, feature],
      }),
    );
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('unsatisfiable block'))).toBe(true);
  });

  it.each([
    ['prefers-color-scheme', 'dark'],
    ['orientation', 'landscape'],
    ['prefers-reduced-motion', 'reduce'],
    ['pointer', 'fine'],
    ['hover', 'hover'],
  ])('allows repeated identical closed values for %s', (feature, value) => {
    const body = feature === 'prefers-color-scheme' ? ':root { --accent: red; }' : '.x { display: block; }';
    const result = fromMediaQueries(`@media (${feature}: ${value}) and (${feature}: ${value}) { ${body} }`);

    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('unsatisfiable block'))).toBe(false);
    if (feature === 'prefers-color-scheme') expect(result.themes).toHaveLength(1);
    else expect(result.boundaries).toHaveLength(1);
  });

  it('normalizes closed values before deciding whether repetitions contradict', () => {
    const result = fromMediaQueries(`
      @media (prefers-reduced-motion: REDUCE) and (prefers-reduced-motion: reduce) {
        .x { animation: none; }
      }
    `);

    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('unsatisfiable block'))).toBe(false);
    expect(result.boundaries).toHaveLength(1);
  });
});

describe('fromMediaQueries — no-silent-drift review findings', () => {
  // FINDING A — a custom property present under only ONE color scheme has its
  // other variant fabricated from the sibling; keep the cross-fill, but flag it.
  it('flags a lone-scheme custom property whose sibling variant is fabricated (scope widened)', () => {
    const result = fromMediaQueries(`
      @media (prefers-color-scheme: dark) { :root { --accent: #f90; } }
    `);
    const t = result.themes[0]!;
    // Cross-fill is kept (defineTheme requires completeness)...
    expect(t.tokens.accent).toEqual({ light: '#f90', dark: '#f90' });
    // ...but the fabricated light variant is surfaced.
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.incompleteThemeVariant);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('warning');
    expect(d!.path).toEqual(['accent']);
    expect(d!.message).toContain('only under the "dark" color scheme');
    expect(d!.message).toContain('"light" variant');
  });

  it('flags a light-only custom property symmetrically (dark fabricated)', () => {
    const result = fromMediaQueries(`
      @media (prefers-color-scheme: light) { :root { --accent: #06c; } }
    `);
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.incompleteThemeVariant);
    expect(d).toBeDefined();
    expect(d!.message).toContain('only under the "light" color scheme');
    expect(d!.message).toContain('"dark" variant');
  });

  it('does NOT flag a :root-based token present under both schemes', () => {
    const result = fromMediaQueries(`
      :root { --bg: #fff; }
      @media (prefers-color-scheme: dark) { :root { --bg: #111; } }
    `);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.incompleteThemeVariant)).toBe(false);
  });

  // FINDING B — dimensional threshold fidelity.
  it('refuses an exact width query rather than emitting an unbounded state', () => {
    const result = fromMediaQueries(`@media (width: 768px) { .x { a: b; } }`);
    expect(result.boundaries).toEqual([]);
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.unsupportedAtRule);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
  });

  it('does NOT flag a faithful plain min-width lowering', () => {
    const result = fromMediaQueries(`@media (min-width: 768px) { .x { a: b; } }`);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.lossyTokenConversion)).toBe(false);
    expect(result.diagnostics).toEqual([]);
  });

  // FINDING C — an `and` conjoining features that lower to DISTINCT targets.
  it('flags an `and` conjoining a width boundary and a discrete feature', () => {
    const result = fromMediaQueries(`
      @media (min-width: 768px) and (prefers-reduced-motion: reduce) { .x { a: b; } }
    `);
    const d = result.diagnostics.find(
      (x) => x.code === MIGRATE_CODES.unsupportedAtRule && x.message.includes('conjoins'),
    );
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.path).toEqual(['@media', '(min-width: 768px) and (prefers-reduced-motion: reduce)']);
    expect(d!.message).toContain('no independent definitions were emitted');
    expect(result.boundaries).toEqual([]);
    expect(result.themes).toEqual([]);
  });

  it('flags an `and` conjoining the width and height axes', () => {
    const result = fromMediaQueries(`@media (min-width: 768px) and (min-height: 400px) { .x { a: b; } }`);
    const d = result.diagnostics.find(
      (x) => x.code === MIGRATE_CODES.unsupportedAtRule && x.message.includes('conjoins'),
    );
    expect(d).toBeDefined();
    expect(result.boundaries).toEqual([]);
  });

  it('refuses a same-axis conjunction containing a finite upper bound', () => {
    const result = fromMediaQueries(`@media (min-width: 768px) and (max-width: 1200px) { .x { a: b; } }`);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('intersects same-axis inclusive-min conjunctions at the maximum lower bound', () => {
    const result = fromMediaQueries(`@media (min-width: 768px) and (min-width: 1024px) { .x { a: b; } }`);
    expect(result.diagnostics).toEqual([]);
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 1024]);
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

describe('fromMediaQueries — boolean logic (not/or/comma) is rejected, never inverted', () => {
  it('rejects a `not (...)` prelude instead of silently inverting the theme', () => {
    const result = fromMediaQueries(`
      :root { --bg: white; }
      @media not (prefers-color-scheme: dark) { :root { --bg: black; } }
    `);
    // The negated block is dropped with a diagnostic, NOT harvested as `dark`.
    const d = result.diagnostics.find((x) => x.code === MIGRATE_CODES.unsupportedAtRule);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.message).toContain('boolean logic');
    // No positive color-scheme block survived, so no dark theme was fabricated.
    expect(result.themes).toEqual([]);
  });

  it('rejects `or`-combined and comma query-list preludes (no boundary fold)', () => {
    const orResult = fromMediaQueries(`@media (min-width: 400px) or (min-width: 800px) { .x { a: b; } }`);
    expect(orResult.diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
    expect(orResult.boundaries).toEqual([]);

    const commaResult = fromMediaQueries(`@media (min-width: 400px), print { .x { a: b; } }`);
    expect(commaResult.diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
    expect(commaResult.boundaries).toEqual([]);
  });

  it('refuses `screen and (min-width)` because media-type identity would be lost', () => {
    const result = fromMediaQueries(`@media screen and (min-width: 768px) { .x { a: b; } }`);
    expect(result.boundaries).toEqual([]);
    const diagnostic = result.diagnostics.find((d) => d.code === MIGRATE_CODES.unsupportedAtRule);
    expect(diagnostic?.severity).toBe('error');
    expect(diagnostic?.message).toContain('media type "screen"');
  });

  it('lowers `all and (min-width)` because `all` is the neutral media type', () => {
    const result = fromMediaQueries(`@media all and (min-width: 768px) { .x { a: b; } }`);
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 768]);
    expect(result.diagnostics).toEqual([]);
  });

  it('refuses a unitless nonzero media length while accepting unitless zero', () => {
    const refused = fromMediaQueries(`@media (min-width: 768) { .x { a: b; } }`);
    expect(refused.boundaries).toEqual([]);
    expect(refused.diagnostics.some((d) => d.code === MIGRATE_CODES.unmappableMediaFeature)).toBe(true);

    const zero = fromMediaQueries(`@media (min-width: 0) { .x { a: b; } }`);
    expect([...zero.boundaries[0]!.thresholds]).toEqual([0]);
  });

  it('refuses `print and (min-width)` rather than widening it to viewport runtime', () => {
    const result = fromMediaQueries(`@media print and (min-width: 768px) { .x { a: b; } }`);
    expect(result.boundaries).toEqual([]);
    const diagnostic = result.diagnostics.find((d) => d.code === MIGRATE_CODES.unsupportedAtRule);
    expect(diagnostic?.severity).toBe('error');
    expect(diagnostic?.message).toContain('media type "print"');
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

/**
 * Unit tests for the `fromContainerQueries` migration adapter — lowering native
 * CSS `@container` query blocks into `defineBoundary` definitions.
 *
 * Covers: a clean lossless partition round-trip (exact produced boundary
 * fields), each NEW decomposition branch (legacy min/max features, the interval
 * form, height axis, named-container grouping/splitting, the `statePrefix`
 * option, comment/string blanking), every diagnostic code the adapter can emit
 * (teeth), and a pathological sub-pixel input whose synthesized state names
 * collide — proving the `defineBoundary` `ValidationError` is caught and
 * surfaced as a `severity:'error'` diagnostic rather than thrown.
 *
 * The adapter is imported from the `@liteship/compiler/migrate` subpath (the
 * development condition resolves to `src`); the facade re-export lands in Phase C.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fromContainerQueries } from '@liteship/compiler/migrate';
import { MIGRATE_CODES } from '@liteship/compiler/migrate';

describe('fromContainerQueries — clean lossless partition', () => {
  it('lowers a 3-block width partition into one exact boundary with no diagnostics', () => {
    const css = `
      @container (width < 768px) { .card { grid-template-columns: 1fr; } }
      @container (width >= 768px) and (width < 1024px) { .card { grid-template-columns: 1fr 1fr; } }
      @container (width >= 1024px) { .card { grid-template-columns: 1fr 1fr 1fr; } }
    `;
    const result = fromContainerQueries(css);

    expect(result.boundaries).toHaveLength(1);
    const boundary = result.boundaries[0]!;
    expect(boundary._tag).toBe('BoundaryDef');
    expect(boundary.input).toBe('viewport.width');
    expect([...boundary.thresholds]).toEqual([0, 768, 1024]);
    expect([...boundary.states]).toEqual(['bp-0', 'bp-768', 'bp-1024']);

    // Boundary-only adapter — no tokens/themes, and nothing lossy.
    expect(result.tokens).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('produces a content-addressed id that round-trips through defineBoundary evaluation', () => {
    const css = `
      @container (width < 600px) { .x { color: red; } }
      @container (width >= 600px) { .x { color: blue; } }
    `;
    const { boundaries } = fromContainerQueries(css);
    expect(boundaries).toHaveLength(1);
    const b = boundaries[0]!;
    expect(String(b.id)).toMatch(/^fnv1a:/);
    expect([...b.thresholds]).toEqual([0, 600]);
    expect([...b.states]).toEqual(['bp-0', 'bp-600']);
  });
});

describe('fromContainerQueries — decomposition branches', () => {
  it('parses the legacy min-width / max-width feature form', () => {
    const css = `
      @container (max-width: 600px) { .x { color: red; } }
      @container (min-width: 600px) { .x { color: blue; } }
    `;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(diagnostics).toEqual([]);
    expect(boundaries).toHaveLength(1);
    expect([...boundaries[0]!.thresholds]).toEqual([0, 600]);
    expect([...boundaries[0]!.states]).toEqual(['bp-0', 'bp-600']);
  });

  it('parses the interval form `A <= width < B`', () => {
    const css = `
      @container (width < 400px) { .x {} }
      @container (400px <= width < 800px) { .x {} }
      @container (width >= 800px) { .x {} }
    `;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(diagnostics).toEqual([]);
    expect([...boundaries[0]!.thresholds]).toEqual([0, 400, 800]);
  });

  it('routes a height condition to the viewport.height axis', () => {
    const css = `@container (height >= 500px) { .x {} }`;
    const { boundaries } = fromContainerQueries(css);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]!.input).toBe('viewport.height');
    expect([...boundaries[0]!.thresholds]).toEqual([500]);
    expect([...boundaries[0]!.states]).toEqual(['bp-500']);
  });

  it('merges same-name blocks and splits different names into separate boundaries', () => {
    const css = `
      @container sidebar (width < 400px) { .x {} }
      @container sidebar (width >= 400px) { .x {} }
      @container main (width >= 800px) { .x {} }
    `;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(diagnostics).toEqual([]);
    expect(boundaries).toHaveLength(2);
    // `sidebar` merged to a 2-state boundary; `main` is its own single-state one.
    expect([...boundaries[0]!.thresholds]).toEqual([0, 400]);
    expect([...boundaries[1]!.thresholds]).toEqual([800]);
  });

  it('honours a custom statePrefix', () => {
    const css = `
      @container (width < 500px) { .x {} }
      @container (width >= 500px) { .x {} }
    `;
    const { boundaries } = fromContainerQueries(css, { statePrefix: 'vp' });
    expect([...boundaries[0]!.states]).toEqual(['vp-0', 'vp-500']);
  });

  it('ignores @container markers inside comments and string values (blanking)', () => {
    const css = `
      /* @container (width >= 9999px) { .ghost {} } */
      .note::before { content: "@container (width >= 8888px) {"; }
      @container (width >= 300px) { .real {} }
    `;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(diagnostics).toEqual([]);
    expect(boundaries).toHaveLength(1);
    expect([...boundaries[0]!.thresholds]).toEqual([300]);
  });
});

describe('fromContainerQueries — diagnostic teeth (every code is reachable)', () => {
  it('emits migrate/non-ascending-thresholds when source blocks are out of order', () => {
    const css = `
      @container (width >= 768px) { .x {} }
      @container (width < 768px) { .x {} }
    `;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(true);
    // Recovered by sorting before defineBoundary.
    expect([...boundaries[0]!.thresholds]).toEqual([0, 768]);
  });

  it('emits migrate/ambiguous-breakpoint for duplicate lower bounds', () => {
    const css = `
      @container (width >= 500px) { .x {} }
      @container (width >= 500px) { .y {} }
    `;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(true);
    // Collapsed to one distinct threshold.
    expect([...boundaries[0]!.thresholds]).toEqual([500]);
  });

  it('emits migrate/ambiguous-breakpoint for overlapping ranges', () => {
    const css = `
      @container (width < 800px) { .x {} }
      @container (width >= 768px) { .y {} }
    `;
    const { diagnostics } = fromContainerQueries(css);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.ambiguousBreakpoint)).toBe(true);
  });

  it('emits migrate/unsupported-at-rule for a non-width/height feature', () => {
    const css = `@container (orientation: landscape) { .x {} }`;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(boundaries).toEqual([]);
    const d = diagnostics.find((x) => x.code === MIGRATE_CODES.unsupportedAtRule);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
  });

  it('emits migrate/unsupported-at-rule for a `not(...)` prelude', () => {
    const css = `@container not (width < 400px) { .x {} }`;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(boundaries).toEqual([]);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });

  it('emits migrate/unsupported-at-rule for an `or`-combined condition', () => {
    const css = `@container (width < 200px) or (width >= 800px) { .x {} }`;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(boundaries).toEqual([]);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });

  it('emits migrate/unsupported-at-rule for mixed width+height axes', () => {
    const css = `@container (width >= 400px) and (height >= 400px) { .x {} }`;
    const { boundaries, diagnostics } = fromContainerQueries(css);
    expect(boundaries).toEqual([]);
    expect(diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });

  it('surfaces a lone finite upper bound (`width < 768px`) as a dropped-cutoff diagnostic', () => {
    // A single `(width < 768px)` block has finite hi=768 that no block starts at,
    // so the 768 cutoff cannot become a threshold — the boundary is `[0]` alone.
    // The dropped upper bound must be surfaced, not silently lost.
    const css = `@container (width < 768px) { .card { display: block; } }`;
    const { boundaries, diagnostics } = fromContainerQueries(css);

    // The lower-bound boundary is still produced...
    expect(boundaries).toHaveLength(1);
    expect([...boundaries[0]!.thresholds]).toEqual([0]);
    // ...and the dropped 768 cutoff is reported (naming the value).
    const d = diagnostics.find((x) => x.code === MIGRATE_CODES.unsupportedAtRule);
    expect(d).toBeDefined();
    expect(d!.message).toContain('768');
  });

  it('does NOT flag a finite upper bound that a sibling block starts at (complete partition)', () => {
    // hi=768 (block 1) coincides with lo=768 (block 2), so the cutoff is
    // represented — no dropped-cutoff diagnostic for a clean partition.
    const css = `
      @container (width < 768px) { .x {} }
      @container (width >= 768px) { .x {} }
    `;
    const { diagnostics } = fromContainerQueries(css);
    expect(diagnostics).toEqual([]);
  });
});

describe('fromContainerQueries — define* throw is caught, never escapes', () => {
  it('surfaces a defineBoundary ValidationError as a severity:error diagnostic', () => {
    // Distinct sub-pixel thresholds (100.2, 100.4) both round to the same
    // synthesized state name `bp-100`, so defineBoundary throws a duplicate
    // state-name ValidationError. The adapter must catch and surface it.
    const css = `
      @container (width < 100.2px) { .x {} }
      @container (100.2px <= width < 100.4px) { .x {} }
      @container (width >= 100.4px) { .x {} }
    `;

    let result!: ReturnType<typeof fromContainerQueries>;
    expect(() => {
      result = fromContainerQueries(css);
    }).not.toThrow();

    // No boundary was produced for the failed group; the failure is a diagnostic.
    expect(result.boundaries).toEqual([]);
    const errorDiag = result.diagnostics.find((d) => d.severity === 'error');
    expect(errorDiag).toBeDefined();
    expect(errorDiag!.cause).toBeDefined();
  });
});

describe('fromContainerQueries — property: partition round-trip preserves thresholds', () => {
  it('reconstructs the exact ascending threshold list from a clean width partition', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.integer({ min: 1, max: 5000 }), { minLength: 1, maxLength: 6 })
          .map((xs) => [...xs].sort((a, b) => a - b)),
        (rest) => {
          const full = [0, ...rest]; // thresholds, ascending, distinct, starting at 0
          const last = full.length - 1;
          const blocks: string[] = [];
          // First state: (width < full[1])
          blocks.push(`@container (width < ${full[1]}px) { .x {} }`);
          // Middle states.
          for (let i = 1; i < last; i++) {
            blocks.push(`@container (width >= ${full[i]}px) and (width < ${full[i + 1]}px) { .x {} }`);
          }
          // Last state: (width >= full[last]).
          blocks.push(`@container (width >= ${full[last]}px) { .x {} }`);

          const { boundaries, diagnostics } = fromContainerQueries(blocks.join('\n'));
          expect(diagnostics).toEqual([]);
          expect(boundaries).toHaveLength(1);
          expect([...boundaries[0]!.thresholds]).toEqual(full);
          expect([...boundaries[0]!.states]).toEqual(full.map((t) => `bp-${t}`));
        },
      ),
      { numRuns: 200 },
    );
  });
});

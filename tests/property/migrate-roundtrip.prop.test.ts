/**
 * Property test: `fromMediaQueries` preserves width-sweep semantics.
 *
 * A set of strictly-ascending, non-overlapping `min-width` breakpoints — each a
 * distinct state — rendered as a `@media (min-width: N) { … }` stylesheet must
 * lower (via {@link fromMediaQueries}) to a `viewport.width` boundary whose state
 * selection agrees with the SOURCE cascade at every sampled width.
 *
 * The two sides are computed INDEPENDENTLY so the equivalence is not tautological:
 *  - PRODUCED side: `Boundary.evaluate(boundary, w)` — the core boundary-evaluation
 *    primitive run on the definition the adapter emitted.
 *  - ORACLE side: the CSS cascade rule applied directly to the generated
 *    breakpoints — every `@media (min-width: N)` with `N <= w` matches, the last
 *    (largest `N`) wins, `base` when none match. This is the boundary contract
 *    stated directly (state index = count of thresholds `<= w`, clamped), used as
 *    the oracle since it is the source's own semantics, not the adapter's output.
 *
 * Deterministic: fast-check runs with a fixed seed; the width sweep is derived
 * from the thresholds (below / at / above each, plus 0 and far-above).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { Boundary } from '@liteship/core';
import { fromMediaQueries } from '@liteship/compiler/migrate';

/** The state name the adapter synthesizes for a threshold under an explicit prefix. */
const stateName = (prefix: string, threshold: number): string => `${prefix}-${threshold}`;

/**
 * The state the SOURCE `@media (min-width)` breakpoints select at width `w`:
 * the largest breakpoint `<= w` wins (last matching rule in the ascending
 * cascade), else the base `0` state. Computed straight from the generated
 * breakpoints — the adapter's output plays no part.
 */
function sourceStateAt(w: number, thresholds: readonly number[], prefix: string): string {
  let winner = 0; // base state is the implicit min-width: 0
  for (const t of thresholds) {
    if (t <= w) winner = t;
    else break; // ascending — no later threshold can match
  }
  return stateName(prefix, winner);
}

/** Strictly-ascending, distinct, positive width breakpoints (1..8 of them). */
const arbBreakpoints = fc
  .uniqueArray(fc.integer({ min: 1, max: 5000 }), { minLength: 1, maxLength: 8 })
  .map((vals) => [...vals].sort((a, b) => a - b));

/**
 * Widths to probe: 0, each threshold minus/at/plus one (clamped to >= 0), and a
 * width far above the top threshold. Covers every below/at/between/above region.
 */
function sweepWidths(thresholds: readonly number[]): number[] {
  const ws = new Set<number>([0]);
  for (const t of thresholds) {
    ws.add(Math.max(0, t - 1));
    ws.add(t);
    ws.add(t + 1);
  }
  ws.add((thresholds[thresholds.length - 1] ?? 0) + 1000);
  return [...ws];
}

describe('fromMediaQueries — width-sweep semantic equivalence', () => {
  test('produced boundary selects the same state as the source breakpoints at every width', () => {
    const prefix = 'bp';
    fc.assert(
      fc.property(arbBreakpoints, (thresholds) => {
        const css = thresholds
          .map((n) => `@media (min-width: ${n}px) { .x { --n: ${n}; } }`)
          .join('\n');

        const { boundaries, diagnostics } = fromMediaQueries(css, { statePrefix: prefix });

        // A clean ascending set lowers to exactly one width boundary, no diagnostics.
        expect(diagnostics).toEqual([]);
        expect(boundaries).toHaveLength(1);
        const boundary = boundaries[0]!;
        expect(boundary.input).toBe('viewport.width');
        expect([...boundary.thresholds]).toEqual([0, ...thresholds]);

        for (const w of sweepWidths(thresholds)) {
          const produced = Boundary.evaluate(boundary, w) as string;
          const oracle = sourceStateAt(w, thresholds, prefix);
          expect(produced).toBe(oracle);
        }
      }),
      { seed: 0x5eed_1422, numRuns: 300 },
    );
  });
});

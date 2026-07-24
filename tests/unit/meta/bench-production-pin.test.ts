import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  DIRECTIVE_BENCH_PAIRS,
  DIRECTIVE_PRODUCTION_PINS,
} from '../../../scripts/bench/directive-suite.ts';
import { repoRoot } from '../../../vitest.shared.ts';

/**
 * Drift guard for the corrected directive-overhead hot-path pairs.
 *
 * The bench's DIRECTIVE closure must measure the SAME call production runs.
 * Production `client:adaptive` (adaptive.ts:39) and the worker steady-state
 * update (worker.ts:253) both evaluate WITH `previousState`, taking the
 * hysteresis branch. A prior framing measured `evaluateBoundary(boundary,
 * value)` with NO previousState — the lightest path production never takes —
 * inflating the directive-abstraction tax against a raw-evaluate baseline.
 *
 * This guard recomputes its `expected` from the PRODUCTION SOURCE (the call
 * site), never from the bench under test (modeled on the head-probe-drift
 * pattern). If a production call site stops passing `previousState`, or the
 * bench reverts to the no-previousState phantom, the guard fails loudly rather
 * than the gate silently measuring a call production never makes.
 */
describe('directive bench production-pin drift guard', () => {
  test('pins every corrected hot-path pair to a real bench pair definition', () => {
    const pairLabels = new Set(DIRECTIVE_BENCH_PAIRS.map((pair) => pair.label));
    for (const pin of DIRECTIVE_PRODUCTION_PINS) {
      expect(pairLabels.has(pin.label)).toBe(true);
      const pair = DIRECTIVE_BENCH_PAIRS.find((candidate) => candidate.label === pin.label)!;
      expect(pair.gate).toBe(true);
      expect(pair.runtimeClass).toBe('hot-path');
    }
    // The two pairs the prior investigation proved were phantoms.
    expect(DIRECTIVE_PRODUCTION_PINS.map((pin) => pin.label)).toEqual(['adaptive', 'worker']);
  });

  for (const pin of DIRECTIVE_PRODUCTION_PINS) {
    describe(`pair: ${pin.label}`, () => {
      test('production call site still passes previousState to evaluateBoundary', () => {
        // SOURCE OF TRUTH: recompute "expected" from the production file. If the
        // call site drops previousState (reverting to the phantom shape), this
        // breaks — the bench can no longer claim to measure the production path.
        const source = readFileSync(join(repoRoot, pin.productionFile), 'utf8');
        expect(source).toContain(pin.productionCall);
        // Defense against a partial rename: the call must carry a previousState
        // argument, not just the two-arg (value-only) phantom form.
        expect(pin.productionCall).toContain('previousState');
      });

      test('bench directive closure measures the hysteresis branch, not the phantom', () => {
        const directive = pin.directiveState(pin.value);
        const productionHysteresis = pin.hysteresisState(pin.value, pin.previousState);
        const phantomRaw = pin.rawState(pin.value);

        // The bench directive must equal the production (with-previousState)
        // result — proving it routes the hysteresis branch production runs.
        expect(directive).toBe(productionHysteresis);

        // …and on the pinned crossing input the hysteresis branch must DIFFER
        // from the no-previousState phantom. If these ever coincide, the chosen
        // (value, previousState) no longer exercises the dead-zone scan and the
        // pin would silently degrade to lightest-vs-lightest again.
        expect(directive).not.toBe(phantomRaw);
      });

      test('the renamed hand-written baseline label is wired into the pair', () => {
        const pair = DIRECTIVE_BENCH_PAIRS.find((candidate) => candidate.label === pin.label)!;
        // The hand-written equivalent must name the hysteresis primitive — a
        // raw-evaluate baseline would under-charge the comparison (the unfairness
        // the original framing had, in the opposite direction).
        expect(pair.baseline).toContain('Boundary.evaluateWithHysteresis');
        expect(pair.baseline).not.toContain('Boundary.evaluate +');
      });
    });
  }
});

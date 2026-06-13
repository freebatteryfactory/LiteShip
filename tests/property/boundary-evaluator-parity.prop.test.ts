/**
 * Phase-0 evaluator consolidation — cross-path determinism proof.
 *
 * After consolidation there is ONE numeric semantics for "map a value → a
 * boundary state index": the f32-canonical `rawIndexF32` kernel. Every
 * execution surface must agree with it — and with the simulated f32 WASM
 * kernel that actually runs in production — on every value, especially at
 * threshold edges (±1 ULP, sub-f32-epsilon, the 2^24 divergence vector).
 *
 * Surfaces under test:
 *   1. core kernel        — `rawIndexF32`
 *   2. core scalar        — `Boundary.evaluate` (string) and `Boundary.evaluateResult().index`
 *   3. quantizer delegate — `evaluate` from `@czap/quantizer` (now re-exports core)
 *   4. worker inline      — `EVALUATE_THRESHOLDS_SOURCE` executed via `new Function`
 *   5. JS batch fallback  — `fallbackKernels.batchBoundaryEval`
 *   6. host startup twin  — `evaluateRegistrationState` (`@czap/worker`)
 *   7. oracle             — `simWasmIndex` (faithful f32 WASM simulation)
 *
 * This file is the "same source → same state across the worker/render seam"
 * proof the Stage dual-export hash-equality rests on.
 *
 * @module
 */
import { describe, it, test, expect } from 'vitest';
import fc from 'fast-check';
import { Boundary, rawIndexF32, EVALUATE_THRESHOLDS_SOURCE } from '@czap/core';
import { evaluate as quantizerEvaluate } from '@czap/quantizer';
import { fallbackKernels } from '../../packages/core/src/wasm-fallback.js';
import { evaluateRegistrationState } from '../../packages/worker/src/compositor-startup.js';

// --- oracle: faithful simulation of the deployed f32 WASM kernel ------------
function simWasmIndex(thresholds: readonly number[], value: number): number {
  const tF32 = Float32Array.from(thresholds);
  const vF32 = Math.fround(value);
  for (let ti = tF32.length - 1; ti >= 0; ti--) {
    if (vF32 >= tF32[ti]!) return ti;
  }
  return 0;
}

// --- worker inline: execute the embedded blob source exactly as the worker does
const evalInline = new Function(
  'thresholds',
  'states',
  'value',
  `${EVALUATE_THRESHOLDS_SOURCE}\nreturn evaluateThresholds(thresholds, states, value);`,
) as (thresholds: readonly number[], states: readonly string[], value: number) => string;

function makeBoundary(thresholds: readonly number[]) {
  const at = thresholds.map((t, i) => [t, `s${i}`] as const);
  return Boundary.make({ input: 'viewport.width', at: at as never });
}

/** Map a state literal `s<N>` back to its index `N`. */
const idxOf = (state: string): number => Number(state.slice(1));

/** Resolve the state index on every surface; returns them labelled for diffing. */
function allIndices(thresholds: readonly number[], value: number): Record<string, number> {
  const boundary = makeBoundary(thresholds);
  const states = boundary.states as readonly string[];

  return {
    kernel: rawIndexF32(thresholds, value),
    scalarString: idxOf(Boundary.evaluate(boundary, value) as string),
    scalarResult: Boundary.evaluateResult(boundary, value).index,
    quantizer: quantizerEvaluate(boundary, value).index,
    workerInline: states.indexOf(evalInline(thresholds, states, value)),
    fallback: fallbackKernels.batchBoundaryEval(Float64Array.from(thresholds), Float64Array.from([value]))[0]!,
    hostTwin: idxOf(
      evaluateRegistrationState(
        { thresholds, states } as unknown as Parameters<typeof evaluateRegistrationState>[0],
        value,
      ),
    ),
  };
}

function expectAllAgree(thresholds: readonly number[], value: number): void {
  const oracle = simWasmIndex(thresholds, value);
  const got = allIndices(thresholds, value);
  for (const [path, index] of Object.entries(got)) {
    expect(index, `${path} ≠ oracle (${oracle}) for thresholds=[${thresholds.join(',')}] value=${value}`).toBe(
      oracle,
    );
  }
}

// Golden sets exercise the unrolled ≤4 path, the binary-search path, non-f32-exact
// fractions, and the known 2^24 f32 divergence vector.
const GOLDEN_SETS: ReadonlyArray<readonly number[]> = [
  [0],
  [0, 768],
  [0, 0.1, 0.3, 0.7],
  [0, 1],
  [0, 320, 768, 1024, 1440, 1920],
  [0, 16777217], // [0, 2^24 + 1] — fround(2^24+1) = 2^24
];

/** 1-ULP neighbours of x. */
function ulpNeighbours(x: number): number[] {
  const buf = new Float64Array([x]);
  const bits = new BigInt64Array(buf.buffer);
  const up = new Float64Array(new BigInt64Array([bits[0]! + 1n]).buffer)[0]!;
  const down = new Float64Array(new BigInt64Array([bits[0]! - 1n]).buffer)[0]!;
  return [down, up];
}

describe('Phase-0 evaluator parity — golden + edge vectors', () => {
  for (const thresholds of GOLDEN_SETS) {
    it(`all six surfaces + oracle agree across a near-threshold sweep: [${thresholds.join(',')}]`, () => {
      const samples: number[] = [];
      for (const t of thresholds) {
        for (const d of [-2, -1, -0.5, 0, 0.5, 1, 2]) samples.push(t + d * 1e-7);
        samples.push(t, Math.fround(t), t * (1 + 1e-7), t * (1 - 1e-7), ...ulpNeighbours(t));
      }
      samples.push(-5, 0, 5000, 1e6);
      for (const v of samples) expectAllAgree(thresholds, v);
    });
  }

  it('the 2^24 divergence vector resolves to index 1 on every surface', () => {
    expectAllAgree([0, 16777217], 16777216);
    // And the old raw-f64 answer (0) is gone everywhere.
    for (const index of Object.values(allIndices([0, 16777217], 16777216))) expect(index).toBe(1);
  });
});

describe('Phase-0 evaluator parity — randomized', () => {
  const arbThresholds = fc
    .uniqueArray(fc.integer({ min: 0, max: 10000 }), { minLength: 1, maxLength: 8 })
    .map((vals) => vals.sort((a, b) => a - b));

  test('every surface agrees with the f32 WASM oracle for arbitrary sorted thresholds × value', () => {
    fc.assert(
      fc.property(arbThresholds, fc.float({ min: Math.fround(-1000), max: Math.fround(20000) }), (thresholds, value) => {
        expectAllAgree(thresholds, value);
      }),
      { numRuns: 500 },
    );
  });

  test('values clustered at threshold ± k ULP still agree across all surfaces', () => {
    fc.assert(
      fc.property(
        arbThresholds,
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: -3, max: 3 }),
        (thresholds, ti, k) => {
          const base = thresholds[ti % thresholds.length]!;
          let v = base;
          for (let i = 0; i < Math.abs(k); i++) v = ulpNeighbours(v)[k < 0 ? 0 : 1]!;
          expectAllAgree(thresholds, v);
        },
      ),
      { numRuns: 500 },
    );
  });
});

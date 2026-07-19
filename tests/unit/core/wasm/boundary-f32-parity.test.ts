/**
 * CUT B1.5 — boundary state selection is f32-canonical across scalar JS, the JS
 * batch fallback, and the f32 WASM batch path.
 *
 * The bug it fixes: the WASM kernel evaluates in f32 (and `WASMDispatch` down-casts
 * to f32 before calling it), while JS compared in f64 — so a value near a
 * threshold could resolve to a DIFFERENT state index depending on whether WASM
 * was loaded (output-identity drift). The fix rounds to f32 in the JS paths,
 * matching the WASM that actually runs in production.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { Boundary } from '@liteship/core';
import { fallbackKernels } from '../../../../packages/core/src/wasm/wasm-fallback.js';

/** Faithful simulation of the deployed WASM: dispatch down-casts to f32 (Float32Array),
 *  Rust reverse-scans `value >= threshold` in f32. This is the production reference. */
function simWasmIndex(thresholds: readonly number[], value: number): number {
  const tF32 = Float32Array.from(thresholds);
  const vF32 = Math.fround(value);
  for (let ti = tF32.length - 1; ti >= 0; ti--) {
    if (vF32 >= tF32[ti]!) return ti;
  }
  return 0;
}

/** The OLD JS behavior: raw f64 reverse-scan. Used only to PROVE the split existed. */
function rawF64Index(thresholds: readonly number[], value: number): number {
  for (let ti = thresholds.length - 1; ti >= 0; ti--) {
    if (value >= thresholds[ti]!) return ti;
  }
  return 0;
}

function makeBoundary(thresholds: readonly number[]) {
  const at = thresholds.map((t, i) => [t, `s${i}`] as const);
  return Boundary.make({ input: 'viewport.width', at: at as never });
}

function scalarIndex(thresholds: readonly number[], value: number): number {
  const state = Boundary.evaluate(makeBoundary(thresholds), value) as string;
  return Number(state.slice(1)); // 's3' → 3
}

function fallbackIndex(thresholds: readonly number[], value: number): number {
  const out = fallbackKernels.batchBoundaryEval(Float64Array.from(thresholds), Float64Array.from([value]));
  return out[0]!;
}

describe('B1.5 — the f64↔f32 split was real (characterization)', () => {
  it('a value the old f64 path and the f32 WASM resolve DIFFERENTLY', () => {
    // 2^24 + 1 is not representable in f32 → rounds to 2^24. Value 2^24 is exact.
    const thresholds = [0, 16777217]; // [0, 2^24 + 1]
    const value = 16777216; // 2^24
    // Old f64: 2^24 >= 2^24+1 is FALSE → state 0.
    expect(rawF64Index(thresholds, value)).toBe(0);
    // Deployed f32 WASM: fround(2^24+1)=2^24, 2^24 >= 2^24 is TRUE → state 1.
    expect(simWasmIndex(thresholds, value)).toBe(1);
    // That divergence is exactly the output-identity drift B1.5 removes.
  });

  it('after B1.5 the scalar + fallback paths both match the f32 WASM on that value', () => {
    const thresholds = [0, 16777217];
    const value = 16777216;
    expect(scalarIndex(thresholds, value)).toBe(1);
    expect(fallbackIndex(thresholds, value)).toBe(1);
    expect(simWasmIndex(thresholds, value)).toBe(1);
  });
});

describe('B1.5 — scalar, fallback, and simulated f32 WASM agree on state index', () => {
  // Thresholds incl. non-f32-exact fractions + a small and a large set (exercises
  // both the unrolled ≤4 path and the binary-search path in _evaluate).
  const SETS: ReadonlyArray<readonly number[]> = [
    [0, 768],
    [0, 0.1, 0.3, 0.7],
    [0, 1],
    [0, 320, 768, 1024, 1440, 1920],
    [0, 16777217],
  ];

  for (const thresholds of SETS) {
    it(`agree across a near-threshold sweep: [${thresholds.join(',')}]`, () => {
      const samples: number[] = [];
      for (const t of thresholds) {
        // sweep tiny f64 perturbations around each threshold + the threshold itself
        for (const d of [-2, -1, -0.5, 0, 0.5, 1, 2]) samples.push(t + d * 1e-7);
        samples.push(t, Math.fround(t), t * (1 + 1e-7), t * (1 - 1e-7));
      }
      samples.push(-5, 5000, 1e6);
      for (const v of samples) {
        const s = scalarIndex(thresholds, v);
        const f = fallbackIndex(thresholds, v);
        const w = simWasmIndex(thresholds, v);
        expect(f, `fallback≠wasm @ ${v}`).toBe(w);
        expect(s, `scalar≠wasm @ ${v}`).toBe(w);
      }
    });
  }
});

describe('B1.5 — ordinary values still resolve as expected (no broad drift)', () => {
  it('clear in-range values pick the obvious state', () => {
    const thresholds = [0, 768, 1024, 1440];
    expect(scalarIndex(thresholds, 500)).toBe(0);
    expect(scalarIndex(thresholds, 800)).toBe(1);
    expect(scalarIndex(thresholds, 1200)).toBe(2);
    expect(scalarIndex(thresholds, 2000)).toBe(3);
    // fallback agrees on the same clear values
    expect(fallbackIndex(thresholds, 800)).toBe(1);
    expect(fallbackIndex(thresholds, 2000)).toBe(3);
  });
});

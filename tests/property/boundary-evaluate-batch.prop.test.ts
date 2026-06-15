/**
 * `Boundary.evaluateBatch` — the WASM-accelerated batch path — must select the
 * SAME indices as the scalar `Boundary.evaluate`, whether or not the Rust
 * kernel is loaded.
 *
 * `evaluateBatch` routes through `WASMDispatch.kernels().batchBoundaryEval`,
 * which is `fallbackKernels` (the `rawIndexF32` loop) by default and the Rust
 * `czap-compute` kernel after `WASMDispatch.load`. The 0.2.1 escape hatch only
 * ships honestly if "accelerated" never means "different": this proves
 * output-identity on both branches, including the f32 edge vectors where an
 * f64-vs-f32 split would surface. The fallback half runs everywhere; the
 * loaded half self-skips until the artifact is built (rust-wasm-parity CI).
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { Boundary, rawIndexF32, WASMDispatch } from '@czap/core';

function makeBoundary(thresholds: readonly number[]) {
  const at = thresholds.map((t, i) => [t, `s${i}`] as const);
  return Boundary.make({ input: 'viewport.width', at: at as never });
}

/** Strictly-ascending, deduped thresholds (the Boundary.make contract). */
const ascendingThresholds = fc
  .array(fc.double({ min: -1e6, max: 1e6, noNaN: true }), { minLength: 1, maxLength: 12 })
  .map((xs) => [...new Set(xs)].sort((a, b) => a - b));

const valueArb = fc.double({ min: -1.5e6, max: 1.5e6, noNaN: true });

/** The canonical per-value indices (what scalar `evaluate` resolves). */
function scalarIndices(thresholds: readonly number[], values: readonly number[]): number[] {
  return values.map((v) => rawIndexF32(thresholds, v));
}

describe('Boundary.evaluateBatch agrees with scalar evaluate (fallback kernels)', () => {
  it('selects rawIndexF32 indices for every value', () => {
    fc.assert(
      fc.property(ascendingThresholds, fc.array(valueArb, { maxLength: 64 }), (thresholds, values) => {
        const bp = makeBoundary(thresholds);
        const batch = Boundary.evaluateBatch(bp, values);
        expect(Array.from(batch)).toEqual(scalarIndices(thresholds, values));
        // And the indices map back to the same state names as scalar evaluate.
        values.forEach((v, i) => {
          expect(bp.states[batch[i]!]).toBe(Boundary.evaluate(bp, v));
        });
      }),
      { numRuns: 200 },
    );
  });

  it('handles the empty value set and edge vectors near a threshold', () => {
    const bp = makeBoundary([0, 640, 1024]);
    expect(Array.from(Boundary.evaluateBatch(bp, []))).toEqual([]);
    // Just below / at / just above each threshold — the f32-canonical edges.
    const probes = [-1, 0, 639.9999, 640, 640.0001, 1023.9999, 1024, 5000];
    expect(Array.from(Boundary.evaluateBatch(bp, probes))).toEqual(scalarIndices([0, 640, 1024], probes));
  });

  it('accepts a Float64Array of values without copying semantics drift', () => {
    const bp = makeBoundary([0, 100, 200]);
    const probes = Float64Array.from([50, 150, 250]);
    expect(Array.from(Boundary.evaluateBatch(bp, probes))).toEqual([0, 1, 2]);
  });
});

// --- loaded-kernel half: identical indices once the Rust WASM is loaded ------
const WASM_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'crates/czap-compute/target/wasm32-unknown-unknown/release/czap_compute.wasm',
);
const wasmPresent = existsSync(WASM_PATH);

describe.skipIf(!wasmPresent)('Boundary.evaluateBatch agrees with scalar evaluate (Rust kernel loaded)', () => {
  afterEach(() => {
    WASMDispatch.unload();
  });

  it('selects identical indices to the fallback once WASM is loaded', async () => {
    const bytes = readFileSync(WASM_PATH);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await WASMDispatch.load(buffer);
    expect(WASMDispatch.isLoaded()).toBe(true);

    fc.assert(
      fc.property(ascendingThresholds, fc.array(valueArb, { maxLength: 64 }), (thresholds, values) => {
        const bp = makeBoundary(thresholds);
        expect(Array.from(Boundary.evaluateBatch(bp, values))).toEqual(scalarIndices(thresholds, values));
      }),
      { numRuns: 200 },
    );
  });
});

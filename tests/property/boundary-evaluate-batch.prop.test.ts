/**
 * `Boundary.evaluateBatch` — the WASM-accelerated batch path — must select the
 * SAME indices as the scalar `Boundary.evaluate`, whether or not the Rust
 * kernel is loaded.
 *
 * `evaluateBatch` routes through `WASMDispatch.kernels().batchBoundaryEval`,
 * which is `fallbackKernels` (the `rawIndexF32` loop) by default and the Rust
 * `liteship-compute` kernel after `WASMDispatch.load`. The 0.2.1 escape hatch only
 * ships honestly if "accelerated" never means "different": this proves
 * output-identity on both branches, including the f32 edge vectors where an
 * f64-vs-f32 split would surface. The fallback half runs everywhere; the
 * loaded half self-skips until the artifact is built (rust-wasm-parity CI).
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { Boundary, rawIndexF32, WASMDispatch, WASM_BATCH_MAX, defineBoundary } from '@liteship/core';
import { wasmAbsent } from '../helpers/capabilities.js';

function makeBoundary(thresholds: readonly number[]) {
  const at = thresholds.map((t, i) => [t, `s${i}`] as const);
  return defineBoundary({ input: 'viewport.width', at: at as never });
}

/** Strictly-ascending, deduped thresholds (the defineBoundary contract). */
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

  it('evaluates EVERY value past the WASM batch cap (chunking, not truncation)', () => {
    // The WASM kernel writes at most WASM_BATCH_MAX results; a naive single call
    // would leave entries past the cap reading unwritten memory. Cross the cap by
    // a few multiples and assert bit-identity with scalar across the whole range.
    const bp = makeBoundary([0, 640, 1024]);
    const n = WASM_BATCH_MAX * 2 + 137;
    const values = Array.from({ length: n }, (_, i) => (i % 1500) - 1);
    const batch = Boundary.evaluateBatch(bp, values);
    expect(batch.length).toBe(n);
    expect(Array.from(batch)).toEqual(scalarIndices([0, 640, 1024], values));
  });
});

describe('the WASM batch cap matches the crate', () => {
  it('WASM_BATCH_MAX equals the kernel buffer size (MAX_VALUES in boundary.rs)', () => {
    // Drift guard: the chunk width MUST equal the crate's static buffer cap, or
    // chunking silently mis-sizes and the >cap entries diverge again.
    const rust = readFileSync(
      resolve(import.meta.dirname, '..', '..', 'crates/liteship-compute/src/boundary.rs'),
      'utf8',
    );
    const match = rust.match(/const\s+MAX_VALUES:\s*usize\s*=\s*(\d+)/);
    expect(match, 'boundary.rs must declare MAX_VALUES').not.toBeNull();
    expect(Number(match![1])).toBe(WASM_BATCH_MAX);
  });
});

// --- loaded-kernel half: identical indices once the Rust WASM is loaded ------
const WASM_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'crates/liteship-compute/target/wasm32-unknown-unknown/release/liteship_compute.wasm',
);
// Single-sourced in the canonical capability symbol table (same artifact path) so the
// capability-gate linker can prove this guard derives from the `wasm-absent` probe.
const wasmPresent = !wasmAbsent;

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

  it('chunks past the kernel cap with the Rust kernel loaded (the real truncation risk)', async () => {
    const bytes = readFileSync(WASM_PATH);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await WASMDispatch.load(buffer);
    const bp = makeBoundary([0, 640, 1024]);
    const n = WASM_BATCH_MAX * 3 + 5;
    const values = Array.from({ length: n }, (_, i) => (i % 1500) - 1);
    expect(Array.from(Boundary.evaluateBatch(bp, values))).toEqual(scalarIndices([0, 640, 1024], values));
  });
});

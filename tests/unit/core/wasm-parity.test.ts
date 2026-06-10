/**
 * WASM/TS kernel parity — the falsifiable version of the comment.
 *
 * `crates/czap-compute/src/boundary.rs` says "matching TypeScript
 * `evaluateBoundary` semantics" and `wasm-fallback.ts` claims results
 * "bit-identical (within float precision) to the Rust WASM kernels" — but
 * until this suite nothing ever executed both sides against each other.
 * Here the compiled wasm32 artifact loads through the REAL
 * `WASMDispatch.load()` path and every kernel is property-checked against
 * its `fallbackKernels` twin on identical inputs.
 *
 * The suite self-skips when the artifact is absent (local machines without
 * a Rust toolchain). CI's rust-wasm-parity job builds the crate from source
 * first, so the parity gate always runs against a fresh artifact there —
 * the same "build truth" doctrine as package:smoke.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as fc from 'fast-check';
import { WASMDispatch, fallbackKernels, type WASMKernels } from '@czap/core';

const WASM_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'crates/czap-compute/target/wasm32-unknown-unknown/release/czap_compute.wasm',
);

const wasmPresent = existsSync(WASM_PATH);

// f32-representable finite floats in a sane magnitude band — the WASM kernels
// compute in f32, and the fallback canonicalizes through toBoundaryF32/f32
// stores, so parity is defined over f32-representable inputs.
const f32 = (constraints: { min: number; max: number }): fc.Arbitrary<number> =>
  fc.double({ ...constraints, noNaN: true, noDefaultInfinity: true }).map((v) => Math.fround(v));

describe.skipIf(!wasmPresent)('WASM/TS kernel parity (czap-compute vs fallbackKernels)', () => {
  let wasm: WASMKernels;

  beforeAll(async () => {
    const bytes = readFileSync(WASM_PATH);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    wasm = await WASMDispatch.load(buffer);
  });

  afterAll(() => {
    // Singleton state — later suites must see the default fallback kernels.
    WASMDispatch.unload();
  });

  it('loads through the real dispatch path and reports loaded', () => {
    expect(WASMDispatch.isLoaded()).toBe(true);
    expect(WASMDispatch.kernels()).not.toBe(fallbackKernels);
  });

  it('batchBoundaryEval: identical state indices for any sorted thresholds + values', () => {
    fc.assert(
      fc.property(
        fc.array(f32({ min: -10_000, max: 10_000 }), { maxLength: 64 }).map((t) => t.sort((a, b) => a - b)),
        fc.array(f32({ min: -20_000, max: 20_000 }), { maxLength: 256 }),
        (thresholds, values) => {
          const t = new Float64Array(thresholds);
          const v = new Float64Array(values);
          expect(Array.from(wasm.batchBoundaryEval(t, v))).toEqual(
            Array.from(fallbackKernels.batchBoundaryEval(t, v)),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('batchBoundaryEval: exact-threshold and duplicate-threshold ties agree', () => {
    // The reverse-scan tie rule (highest matching index wins) is the part a
    // reimplementation gets wrong first — pin it explicitly on both sides.
    const thresholds = new Float64Array([0, 20, 20, 50]);
    const values = new Float64Array([-1, 0, 19.5, 20, 49, 50, 51]);
    const expected = [0, 0, 0, 2, 2, 3, 3];
    expect(Array.from(wasm.batchBoundaryEval(thresholds, values))).toEqual(expected);
    expect(Array.from(fallbackKernels.batchBoundaryEval(thresholds, values))).toEqual(expected);
  });

  it('springCurve: trajectories agree within f32 tolerance across damping regimes', () => {
    fc.assert(
      fc.property(
        f32({ min: 1, max: 500 }), // stiffness
        f32({ min: 0, max: 100 }), // damping — spans under/critical/overdamped
        f32({ min: 0.1, max: 10 }), // mass
        fc.integer({ min: 1, max: 255 }), // samples
        (stiffness, damping, mass, samples) => {
          const ws = wasm.springCurve(stiffness, damping, mass, samples);
          const ts = fallbackKernels.springCurve(stiffness, damping, mass, samples);
          expect(ws.length).toBe(ts.length);
          for (let i = 0; i < ws.length; i++) {
            // libm f32 transcendentals vs JS f64 Math truncated to f32.
            expect(Math.abs(ws[i]! - ts[i]!)).toBeLessThanOrEqual(1e-3);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('springCurve: both sides pin exact endpoints 0 and 1', () => {
    const ws = wasm.springCurve(170, 26, 1, 32);
    const ts = fallbackKernels.springCurve(170, 26, 1, 32);
    expect([ws[0], ws[32]]).toEqual([0, 1]);
    expect([ts[0], ts[32]]).toEqual([0, 1]);
  });

  it('blendNormalize: bit-identical clamping and normalization', () => {
    // Both sides accumulate the total and compute the reciprocal in f64
    // with the same op order, then round each product to f32 — so parity
    // here is EXACT, including subnormal weights (a single 1.4e-45 weight
    // normalizes to 1.0 on both sides; an f32 reciprocal would emit inf).
    fc.assert(
      fc.property(fc.array(f32({ min: -1000, max: 1000 }), { maxLength: 64 }), (weights) => {
        const ws = wasm.blendNormalize(new Float32Array(weights));
        const ts = fallbackKernels.blendNormalize(new Float32Array(weights));
        expect(Array.from(ws)).toEqual(Array.from(ts));
      }),
      { numRuns: 200 },
    );
  });

  it('blendNormalize: a single subnormal weight normalizes to 1.0 on both sides', () => {
    const subnormal = 1.401298464324817e-45;
    expect(Array.from(wasm.blendNormalize(new Float32Array([subnormal])))).toEqual([1]);
    expect(Array.from(fallbackKernels.blendNormalize(new Float32Array([subnormal])))).toEqual([1]);
  });
});

describe.skipIf(wasmPresent)('WASM/TS kernel parity (artifact absent)', () => {
  it.skip('parity suite — czap_compute.wasm not built (run cargo build --release --target wasm32-unknown-unknown)', () => {});
});

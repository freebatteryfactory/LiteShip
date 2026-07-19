/**
 * WASM/TS kernel parity — the falsifiable version of the comment.
 *
 * `crates/liteship-compute/src/boundary.rs` says "matching TypeScript
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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as fc from 'fast-check';
import { WASMDispatch, fallbackKernels, type WASMKernels } from '@liteship/core';
import { wasmAbsent } from '../../helpers/capabilities.js';

const WASM_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'crates/liteship-compute/target/wasm32-unknown-unknown/release/liteship_compute.wasm',
);

// The presence probe is single-sourced in the canonical capability symbol table (same artifact path)
// so the capability-gate linker can prove this guard derives from the `wasm-absent` probe.
const wasmPresent = !wasmAbsent;

// f32-representable finite floats in a sane magnitude band — the WASM kernels
// compute in f32, and the fallback canonicalizes through toBoundaryF32/f32
// stores, so parity is defined over f32-representable inputs.
const f32 = (constraints: { min: number; max: number }): fc.Arbitrary<number> =>
  fc.double({ ...constraints, noNaN: true, noDefaultInfinity: true }).map((v) => Math.fround(v));

describe.skipIf(!wasmPresent)('WASM/TS kernel parity (liteship-compute vs fallbackKernels)', () => {
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

describe.skipIf(wasmPresent)('WASM/TS kernel parity (artifact absent — fallbackKernels is what ships here)', () => {
  // When the wasm32 artifact is absent (local machines without a Rust toolchain),
  // `WASMDispatch` never upgrades, so `fallbackKernels` — the pure-TS path — IS the
  // production compute path. There is nothing to compare it AGAINST, so instead of
  // an empty skip we assert the fallback kernels satisfy the SAME mathematical
  // properties the parity suite holds the wasm to: the f32 reverse-scan tie rule,
  // spring endpoint pinning, blend normalization, determinism, and bounded output.
  // An independent inline oracle (naive f32 linear scan) checks batchBoundaryEval so
  // the assertion is a real contract check, not a tautology against the same impl.

  /** Independent reference: largest i with thresholds[i] <= value (f32), else 0. */
  const refIndex = (thresholds: ArrayLike<number>, value: number): number => {
    const v = Math.fround(value);
    let idx = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (Math.fround(thresholds[i] as number) <= v) idx = i;
    }
    return thresholds.length === 0 ? 0 : idx;
  };

  it('is the live compute path: WASMDispatch hands back fallbackKernels when no wasm is loaded', () => {
    expect(WASMDispatch.isLoaded()).toBe(false);
    expect(WASMDispatch.kernels()).toBe(fallbackKernels);
  });

  it('batchBoundaryEval: agrees with an independent f32 reverse-scan oracle + is deterministic', () => {
    fc.assert(
      fc.property(
        fc.array(f32({ min: -10_000, max: 10_000 }), { maxLength: 64 }).map((t) => t.sort((a, b) => a - b)),
        fc.array(f32({ min: -20_000, max: 20_000 }), { maxLength: 256 }),
        (thresholds, values) => {
          const t = new Float64Array(thresholds);
          const v = new Float64Array(values);
          const out = fallbackKernels.batchBoundaryEval(t, v);
          // Every selected index matches the independent oracle and is in range.
          for (let i = 0; i < v.length; i++) {
            expect(out[i]).toBe(refIndex(thresholds, values[i]!));
            expect(out[i]!).toBeLessThan(Math.max(1, thresholds.length));
          }
          // Determinism: same inputs → same output, every time.
          expect(Array.from(fallbackKernels.batchBoundaryEval(t, v))).toEqual(Array.from(out));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('batchBoundaryEval: exact-threshold and duplicate-threshold ties resolve to the highest index', () => {
    // The reverse-scan tie rule (highest matching index wins) — the same golden
    // vector the wasm-present suite pins both sides against.
    const thresholds = new Float64Array([0, 20, 20, 50]);
    const values = new Float64Array([-1, 0, 19.5, 20, 49, 50, 51]);
    expect(Array.from(fallbackKernels.batchBoundaryEval(thresholds, values))).toEqual([0, 0, 0, 2, 2, 3, 3]);
  });

  it('springCurve: pins endpoints 0 and 1, returns samples+1 length, and stays bounded + deterministic', () => {
    fc.assert(
      fc.property(
        f32({ min: 1, max: 500 }), // stiffness
        f32({ min: 0, max: 100 }), // damping — under/critical/overdamped
        f32({ min: 0.1, max: 10 }), // mass
        fc.integer({ min: 1, max: 255 }), // samples
        (stiffness, damping, mass, samples) => {
          const out = fallbackKernels.springCurve(stiffness, damping, mass, samples);
          expect(out.length).toBe(samples + 1);
          // Endpoints are pinned exactly on the production path.
          expect(out[0]).toBe(0);
          expect(out[samples]).toBe(1);
          // No NaN/Inf escapes for any damping regime.
          for (let i = 0; i < out.length; i++) {
            expect(Number.isFinite(out[i]!)).toBe(true);
          }
          // Determinism.
          expect(Array.from(fallbackKernels.springCurve(stiffness, damping, mass, samples))).toEqual(Array.from(out));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('springCurve: a critically-damped curve rises monotonically toward 1 with no overshoot', () => {
    // zeta == 1 (damping = 2*sqrt(stiffness*mass)) is the closed-form no-oscillation
    // regime: the curve must be non-decreasing and never exceed 1.
    const stiffness = 100;
    const mass = 1;
    const damping = 2 * Math.sqrt(stiffness * mass); // critical
    const out = fallbackKernels.springCurve(stiffness, damping, mass, 64);
    for (let i = 0; i < out.length; i++) {
      expect(out[i]!).toBeGreaterThanOrEqual(0);
      expect(out[i]!).toBeLessThanOrEqual(1);
      if (i > 0) expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]!);
    }
  });

  it('blendNormalize: positive weights sum to 1, negatives clamp to 0, all-zero stays zero', () => {
    fc.assert(
      fc.property(fc.array(f32({ min: -1000, max: 1000 }), { maxLength: 64 }), (weights) => {
        const out = fallbackKernels.blendNormalize(new Float32Array(weights));
        let sum = 0;
        for (let i = 0; i < out.length; i++) {
          expect(out[i]!).toBeGreaterThanOrEqual(0); // negatives clamped to 0
          sum += out[i]!;
        }
        const hadPositive = weights.some((w) => w > 0);
        if (hadPositive) {
          expect(sum).toBeCloseTo(1, 5);
        } else {
          expect(sum).toBe(0); // no positive mass → nothing to normalize
        }
      }),
      { numRuns: 200 },
    );
  });

  it('blendNormalize: a single subnormal weight normalizes to exactly 1.0', () => {
    const subnormal = 1.401298464324817e-45;
    expect(Array.from(fallbackKernels.blendNormalize(new Float32Array([subnormal])))).toEqual([1]);
  });
});

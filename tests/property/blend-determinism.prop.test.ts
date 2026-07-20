/**
 * BlendTree determinism — f32-canonical + accumulation-order independence.
 *
 * `BlendTree.computeBlend` (packages/core/src/motion/blend.ts) is a pure f64 weighted
 * average with NO WASM twin and NO parity test — yet it sums per-node
 * contributions by iterating `nodes.values()` in Map insertion order. A weighted
 * sum in IEEE-754 is NOT associative: reordering the addends shifts the rounding,
 * so the SAME node/weight set added in a different order could compute a
 * different blend. That is the float-determinism scar class ("diverges by
 * accumulation order") this file pins.
 *
 * Two properties, both within f32 tolerance (the determinism budget the rest of
 * the boundary seam is canonicalized to — see boundary-f32.ts / the
 * boundary-evaluator-parity proof):
 *   1. ORDER-INDEPENDENT — permuting the order nodes are added does not change
 *      the computed blend. This is the falsifiable version of "deterministic".
 *   2. F32-CANONICAL — the blend equals its own value re-rounded through f32,
 *      so the output carries no sub-f32 noise that could diverge a downstream
 *      f32 consumer (the worker/render seam compares in f32).
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { BlendTree } from '@liteship/core';

type Vec = { x: number; y: number; z: number };

/** One blend input: a unique node name, a numeric vector, and a weight. */
interface Entry {
  name: string;
  value: Vec;
  weight: number;
}

/** Build a tree, add entries in the given order, and compute the blend. */
function blendInOrder(entries: readonly Entry[]): Vec {
  const tree = BlendTree.make<Vec>();
  for (const e of entries) tree.add(e.name, e.value, e.weight);
  return tree.compute();
}

/**
 * Order-independence tolerance for one axis. The blend is a normalized weighted
 * sum in f64; reordering the addends only perturbs the result by f64
 * reassociation error, bounded by ~`n · 2^-52 · Σ|addend|`. We scale that by the
 * largest-magnitude input on the axis (an upper bound on any single addend) with
 * a ~100× safety factor for the normalize-divide and Map walk. This sits ~5
 * orders of magnitude below f32 ULP scale, so it is TIGHT enough that genuine
 * order-dependence (e.g. per-step f32 rounding inside the accumulator, ~1e-3
 * absolute noise at O(1e4) values) FAILS, yet LOOSE enough that honest f64
 * reassociation passes on every input.
 */
function orderTol(entries: readonly Entry[], axis: keyof Vec): number {
  let maxAbs = 1;
  for (const e of entries) maxAbs = Math.max(maxAbs, Math.abs(e.value[axis]));
  return entries.length * Number.EPSILON * maxAbs * 1e2;
}

/** Fisher–Yates over a copy, driven by a fast-check-supplied permutation seed. */
function permute<T>(items: readonly T[], swaps: readonly number[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = swaps[i - 1]! % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const f32 = (v: number): number => Math.fround(v);

// Distinct node names (so a permutation never overwrites a node), plus a vector
// and a weight per entry. Weights span 0 (excluded) → large, to exercise the
// `weight > 0` gate and the normalization divide.
const arbEntries = fc
  .uniqueArray(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 6 }),
      value: fc.record({
        x: fc.double({ min: -1e4, max: 1e4, noNaN: true, noDefaultInfinity: true }),
        y: fc.double({ min: -1e4, max: 1e4, noNaN: true, noDefaultInfinity: true }),
        z: fc.double({ min: -1e4, max: 1e4, noNaN: true, noDefaultInfinity: true }),
      }),
      weight: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
    }),
    { minLength: 1, maxLength: 12, selector: (e) => e.name },
  )
  .filter((es) => es.some((e) => e.weight > 0)); // at least one contributor

describe('BlendTree.computeBlend — accumulation-order independence', () => {
  test('permuting add-order does not change the blend (within f32 tolerance)', () => {
    fc.assert(
      fc.asyncProperty(arbEntries, fc.array(fc.nat(), { minLength: 11, maxLength: 11 }), async (entries, swaps) => {
        const base = await blendInOrder(entries);
        const shuffled = await blendInOrder(permute(entries, swaps));
        for (const k of ['x', 'y', 'z'] as const) {
          expect(
            Math.abs(base[k] - shuffled[k]),
            `axis ${k}: base=${base[k]} shuffled=${shuffled[k]} for n=${entries.length}`,
          ).toBeLessThanOrEqual(orderTol(entries, k));
        }
      }),
      { numRuns: 300 },
    );
  });

  test('adversarial near-cancellation is order-stable (the teeth case)', async () => {
    // Large opposite-sign contributions that catastrophically cancel to a small
    // blend: this is where accumulation order bites hardest. A kernel that rounds
    // partial sums to f32 (the regression) diverges here by ~1e-4 across orders —
    // 5 orders of magnitude above orderTol — while the f64 kernel agrees to
    // sub-f64-ULP. This deterministic case gives the suite teeth independent of
    // the random generator's seed.
    const entries: Entry[] = [
      { name: 'a', value: { x: 9999, y: 9999, z: 9999 }, weight: 500 },
      { name: 'b', value: { x: -9998.3, y: -9998.3, z: -9998.3 }, weight: 500 },
      { name: 'c', value: { x: 0.123456789, y: 0.123456789, z: 0.123456789 }, weight: 1 },
      { name: 'd', value: { x: 9997.7, y: 9997.7, z: 9997.7 }, weight: 333 },
      { name: 'e', value: { x: -9996.1, y: -9996.1, z: -9996.1 }, weight: 333 },
    ];
    const fwd = await blendInOrder(entries);
    const rev = await blendInOrder(entries.slice().reverse());
    const perm = await blendInOrder(permute(entries, [3, 1, 4, 2]));
    for (const k of ['x', 'y', 'z'] as const) {
      const tol = orderTol(entries, k);
      expect(Math.abs(fwd[k] - rev[k]), `rev axis ${k}`).toBeLessThanOrEqual(tol);
      expect(Math.abs(fwd[k] - perm[k]), `perm axis ${k}`).toBeLessThanOrEqual(tol);
    }
  });

  test('reversing add-order is a no-op on the blend (the worst-case permutation)', () => {
    fc.assert(
      fc.asyncProperty(arbEntries, async (entries) => {
        const forward = await blendInOrder(entries);
        const reversed = await blendInOrder(entries.slice().reverse());
        for (const k of ['x', 'y', 'z'] as const) {
          expect(Math.abs(forward[k] - reversed[k])).toBeLessThanOrEqual(orderTol(entries, k));
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('BlendTree.computeBlend — f32-canonical output', () => {
  test('the blend equals its own f32 rounding (no sub-f32 divergence noise)', () => {
    fc.assert(
      fc.asyncProperty(arbEntries, async (entries) => {
        const blend = await blendInOrder(entries);
        for (const k of ['x', 'y', 'z'] as const) {
          // Down-cast to f32 (the precision the worker/render seam compares at)
          // and back: the value must already sit on the f32 grid within tol, so
          // an f32 consumer sees the SAME number the f64 producer computed.
          const tol = Math.max(1, Math.abs(blend[k])) * 1e-5;
          expect(Math.abs(blend[k] - f32(blend[k]))).toBeLessThanOrEqual(tol);
        }
      }),
      { numRuns: 200 },
    );
  });

  test('golden: equal-weight mean is order-independent and exact', async () => {
    const a: Entry = { name: 'a', value: { x: 0, y: 0, z: 0 }, weight: 1 };
    const b: Entry = { name: 'b', value: { x: 100, y: 200, z: 300 }, weight: 1 };
    const ab = await blendInOrder([a, b]);
    const ba = await blendInOrder([b, a]);
    expect(ab).toEqual(ba);
    expect(ab.x).toBeCloseTo(50, 10);
    expect(ab.y).toBeCloseTo(100, 10);
    expect(ab.z).toBeCloseTo(150, 10);
  });
});

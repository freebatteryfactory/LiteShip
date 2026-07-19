/**
 * f32-canonical boundary comparison seam (CUT B1.5).
 *
 * The WASM batch kernel (crates/liteship-compute/src/boundary.rs) evaluates
 * boundaries in f32, and `WASMDispatch.batchBoundaryEval` down-casts thresholds
 * and values to f32 (Float32Array) before the call. The JS scalar path and the
 * JS batch fallback historically compared in f64 — so a value within
 * ~1e-7 of a threshold could resolve to a DIFFERENT state index depending on
 * whether WASM was loaded (output-identity drift).
 *
 * The fix: ONE seam that rounds to f32 (matching the deployed WASM semantics),
 * applied to raw state selection in the scalar path AND the batch fallback. We
 * make JS conform to the f32 WASM that actually runs in production rather than
 * migrate the kernel to f64 (which would require rebuilding an out-of-repo .wasm
 * artifact in lockstep — a worse, unverifiable hazard). See
 * tests/unit/core/boundary-f32-parity.test.ts.
 *
 * @module
 */

/** Round a boundary signal/threshold to f32, matching the WASM kernel's precision. */
export function toBoundaryF32(value: number): number {
  return Math.fround(value);
}

/**
 * The single f32-canonical state-index kernel.
 *
 * Returns the index of the state a `value` falls into: the largest `i` where
 * `thresholds[i] <= value` (in f32), or `0` when the value is below every
 * threshold. Thresholds are assumed strictly ascending (guaranteed by
 * `Boundary.make`). Uses an unrolled fast path for small arrays (≤4) and binary
 * search beyond — both equivalent to a linear reverse-scan for sorted input, so
 * `EVALUATE_THRESHOLDS_SOURCE` (the worker blob twin, a linear reverse-scan) and
 * `fallbackKernels.batchBoundaryEval` agree with this on every input.
 *
 * This is THE numeric semantics for boundary evaluation across the whole repo:
 * scalar (`Boundary.evaluate`/`evaluateResult`), the JS batch fallback, the
 * worker inline string, and the host startup twin all route through it (or its
 * string mirror). Cross-path agreement is locked by
 * `tests/property/boundary-evaluator-parity.prop.test.ts`.
 */
export function rawIndexF32(thresholds: ArrayLike<number>, value: number): number {
  const len = thresholds.length;
  if (len === 0) return 0;

  const v = toBoundaryF32(value);
  const t = (i: number): number => toBoundaryF32(thresholds[i] as number);

  // Fast path: unrolled if-chain for small threshold arrays (≤4), highest first.
  if (len <= 4) {
    if (len === 1) return 0;
    if (len === 2) return v >= t(1) ? 1 : 0;
    if (len === 3) {
      if (v >= t(2)) return 2;
      if (v >= t(1)) return 1;
      return 0;
    }
    // len === 4
    if (v >= t(3)) return 3;
    if (v >= t(2)) return 2;
    if (v >= t(1)) return 1;
    return 0;
  }

  // Binary search: rightmost threshold <= value.
  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t(mid) <= v) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 ? lo - 1 : 0;
}

/**
 * Worker-blob twin of {@link rawIndexF32}, as an inlinable JavaScript source string.
 *
 * Worker blob scripts run in a classic Worker created from a Blob and cannot use
 * ES module imports, so the threshold-evaluation logic must be embedded as a
 * string. This is the single source of that string — `@liteship/worker`'s
 * `render-worker` and `compositor` blob scripts both interpolate it, so they
 * cannot drift from each other. It is a linear reverse-scan, f32-canonical
 * (`Math.fround`) to match {@link rawIndexF32} and the deployed WASM kernel.
 *
 * Stateless by design: the worker never owns hysteresis/transition state (the
 * host reconciles crossings via `apply-resolved-state`), so the signature is
 * `(thresholds, states, value)` with no previous-state argument.
 *
 * The property test executes this string via `new Function(...)` and asserts it
 * agrees with `rawIndexF32` on every golden/edge vector — that execution IS the
 * anti-drift guarantee.
 */
export const EVALUATE_THRESHOLDS_SOURCE = `\
/**
 * Evaluate which discrete state a value falls into based on thresholds.
 * f32-canonical (Math.fround); thresholds sorted ascending; value below all
 * thresholds maps to the first state.
 *
 * Canonical kernel: packages/core/src/boundary-f32.ts (rawIndexF32).
 *
 * @param {number[]} thresholds
 * @param {string[]} states
 * @param {number} value
 * @returns {string}
 */
function evaluateThresholds(thresholds, states, value) {
  const v = Math.fround(value);
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (v >= Math.fround(thresholds[i])) {
      return states[i] || states[0] || "";
    }
  }
  return states[0] || "";
}`;

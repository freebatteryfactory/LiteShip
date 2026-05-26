/**
 * f32-canonical boundary comparison seam (CUT B1.5).
 *
 * The WASM batch kernel (crates/czap-compute/src/boundary.rs) evaluates
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

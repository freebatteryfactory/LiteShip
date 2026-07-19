/**
 * The representative HOT-PATH complexity probes — the SUTs the complexity-class
 * contract sweeps + fits. Each probe drives a real shipped hot path across input
 * sizes so {@link measureComplexityCurve} can fit its empirical complexity class.
 *
 * The two paths chosen are both on the trust spine and both have a clear,
 * load-robust complexity LAW the gate can pin against regression:
 *
 * - `boundary.evaluateBatch` — the canonical boundary evaluator's batch face
 *   ({@link Boundary.evaluateBatch}) sweeps the NUMBER OF VALUES it evaluates
 *   against one boundary. It scans each value once, so its law is O(n) in value
 *   count. (The per-VALUE selection {@link Boundary.evaluate} is itself O(log n)
 *   in threshold count via binary search, so its tiny growth is dominated by
 *   fixed overhead and does not fit cleanly; the batch face exposes the
 *   honest-to-measure linear law over the value axis instead.) A regression here
 *   — a per-value scan turned into a nested loop (O(n²)) — must fail the gate.
 *
 * - `contentAddress.of` — the one identity kernel ({@link contentAddressOf},
 *   canonicalize → CanonicalCbor → fnv1a) sweeps the LENGTH of the value it
 *   addresses. Encoding + hashing are linear in the byte length, so its law is
 *   O(n) in element count. A regression here (an accidental O(n²) canonicalize)
 *   would silently make every content address quadratic — the exact "if this
 *   lies, the perf contract is broken" hazard.
 *
 * Probes build their size-n fixture in the builder (OUTSIDE the timed thunk), so
 * the curve measures the hot path, not fixture construction. Durations are read
 * through {@link measureComplexityCurve}'s injected clock (defaults to
 * {@link systemClock}) — never the wall clock.
 *
 * @module
 */

import { Boundary, contentAddressOf } from '@liteship/core';
import type { ComplexityProbe } from './contracts.ts';

/** A fixed 3-threshold boundary the batch probe evaluates many values against. */
const PROBE_BOUNDARY = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ] as const,
});

/**
 * Build a value array of length `valueCount` to evaluate in one
 * {@link Boundary.evaluateBatch} call. The array is constructed OUTSIDE the timed
 * thunk; only the batch evaluation (one scan over the n values) is measured.
 */
function buildBatchOfSize(valueCount: number): () => void {
  const values = Float64Array.from({ length: valueCount }, (_, index) => (index * 7) % 1500);
  return (): void => {
    void Boundary.evaluateBatch(PROBE_BOUNDARY, values);
  };
}

/**
 * Build a value with `elementCount` array entries to content-address. The array
 * is constructed OUTSIDE the timed thunk; only the {@link contentAddressOf} call
 * (canonicalize → CBOR → fnv1a over the whole structure) is measured.
 */
function buildContentAddressOfSize(elementCount: number): () => void {
  const value = {
    kind: 'complexity-probe',
    entries: Array.from({ length: elementCount }, (_, index) => ({
      id: index,
      label: `entry-${index}`,
    })),
  };
  return (): void => {
    void contentAddressOf(value);
  };
}

/** The boundary-evaluator batch hot path — O(n) in value count. */
export const boundaryEvaluateProbe: ComplexityProbe = {
  path: 'boundary.evaluateBatch',
  describe: 'Boundary.evaluateBatch — one scan over the value array; O(n) in value count.',
  shape: 'batch-values',
  // Sizes start at 256 (not 64) so the linear term dominates fixed per-call
  // overhead — the smaller sizes flattened the slope toward the O(log n) band.
  // With this range the slope sits firmly at ~0.9 (R² ~0.997), no class flap.
  sizes: [256, 1024, 4096, 16384, 65536],
  workloadFor: buildBatchOfSize,
};

/** The identity kernel hot path — O(n) in element count. */
export const contentAddressProbe: ComplexityProbe = {
  path: 'contentAddress.of',
  describe: 'contentAddressOf — canonicalize → CanonicalCbor → fnv1a; O(n) in element count.',
  shape: 'address-elements',
  sizes: [8, 32, 128, 512, 2048],
  workloadFor: buildContentAddressOfSize,
};

/** Every complexity probe the contract layer measures + maps. */
export const COMPLEXITY_PROBES: readonly ComplexityProbe[] = [
  boundaryEvaluateProbe,
  contentAddressProbe,
];

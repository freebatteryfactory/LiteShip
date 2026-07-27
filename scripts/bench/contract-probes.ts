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

import { Boundary, contentAddressOf, defineBoundary } from '@liteship/core';
import { CanonicalCbor, decode as decodeCanonicalCbor } from '@liteship/canonical';
import { defineComponentCatalog, renderHash, validateGeneratedUITree, type GeneratedUINode } from '@liteship/genui';
import { computeWaveform, detectBeats, detectOnsets, walkRiff } from '@liteship/assets';
import { defineGate, finding, memoryContext, runGates, type Gate } from '@liteship/gauntlet';
import type { ComplexityProbe } from './contracts.ts';

/** A fixed 3-threshold boundary the batch probe evaluates many values against. */
const PROBE_BOUNDARY = defineBoundary({
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

function buildCanonicalEncodeOfSize(elementCount: number): () => void {
  const value = Array.from({ length: elementCount }, (_, index) => index);
  return (): void => {
    void CanonicalCbor.encode(value);
  };
}

function buildCanonicalDecodeOfSize(elementCount: number): () => void {
  const bytes = CanonicalCbor.encode(Array.from({ length: elementCount }, (_, index) => index));
  return (): void => {
    void decodeCanonicalCbor(bytes);
  };
}

const GENUI_PROBE_CATALOG = defineComponentCatalog({
  version: 'complexity-v1',
  components: {
    Root: {
      props: { title: { type: 'string', required: true } },
      children: 'optional',
      allowedChildNames: ['Text'],
    },
    Text: { props: { text: { type: 'string', required: true } }, children: 'none' },
  },
});

function buildGenuiProbeTree(nodeCount: number): GeneratedUINode {
  return {
    name: 'Root',
    props: { title: 'complexity' },
    children: Array.from({ length: nodeCount - 1 }, (_, index) => ({
      name: 'Text',
      props: { text: `leaf-${index}` },
    })),
  };
}

function buildGenuiValidationOfSize(nodeCount: number): () => void {
  const tree = buildGenuiProbeTree(nodeCount);
  return (): void => {
    void validateGeneratedUITree(tree, GENUI_PROBE_CATALOG);
  };
}

function buildGenuiRenderHashOfSize(nodeCount: number): () => void {
  const tree = buildGenuiProbeTree(nodeCount);
  return (): void => {
    void renderHash(tree, GENUI_PROBE_CATALOG);
  };
}

function buildRiffWalkOfSize(chunkCount: number): () => void {
  const bytes = new Uint8Array(12 + chunkCount * 8);
  bytes.set(new TextEncoder().encode('RIFF'), 0);
  new DataView(bytes.buffer).setUint32(4, bytes.byteLength - 8, true);
  bytes.set(new TextEncoder().encode('WAVE'), 8);
  for (let index = 0; index < chunkCount; index++) bytes.set(new TextEncoder().encode('JUNK'), 12 + index * 8);
  return (): void => {
    for (const chunk of walkRiff(bytes.buffer)) void chunk;
  };
}

function assetAudioOfSize(frameCount: number): { readonly sampleRate: number; readonly samples: Float32Array } {
  return {
    sampleRate: 48_000,
    samples: Float32Array.from({ length: frameCount }, (_, index) => Math.sin((2 * Math.PI * index) / 1200)),
  };
}

function buildWaveformOfSize(frameCount: number): () => void {
  const audio = assetAudioOfSize(frameCount);
  return (): void => {
    void computeWaveform(audio, { bins: 512 });
  };
}

function buildOnsetsOfSize(frameCount: number): () => void {
  const audio = assetAudioOfSize(frameCount);
  return (): void => {
    void detectOnsets(audio);
  };
}

function buildBeatsOfSize(frameCount: number): () => void {
  const audio = assetAudioOfSize(frameCount);
  return (): void => {
    void detectBeats(audio);
  };
}

const GAUNTLET_PROBE_CONTEXT = memoryContext({ 'subject.ts': 'clean' });
const GAUNTLET_PROBE_GATE: Gate = defineGate({
  id: 'complexity/gauntlet-clean-token',
  extension: { namespace: 'complexity', owner: 'LiteShip benchmark harness' },
  level: 'L4',
  describe: 'scan one file for a forbidden complexity-probe token',
  run: (context) =>
    context
      .files()
      .filter((file) => (context.readFile(file) ?? '').includes('FORBIDDEN'))
      .map((file) =>
        finding({
          ruleId: 'complexity/gauntlet-clean-token',
          severity: 'error',
          level: 'L4',
          title: 'forbidden complexity-probe token',
          detail: file,
        }),
      ),
  fixtures: {
    red: { name: 'token present', context: memoryContext({ 'bad.ts': 'FORBIDDEN' }) },
    green: { name: 'token absent', context: memoryContext({ 'good.ts': 'clean' }) },
    mutation: { describe: 'disable detection', mutate: (gate) => ({ ...gate, run: () => [] }) },
  },
});

function buildGauntletRunOfSize(gateCount: number): () => void {
  const gates = Array.from({ length: gateCount }, () => GAUNTLET_PROBE_GATE);
  return (): void => {
    void runGates(gates, GAUNTLET_PROBE_CONTEXT);
  };
}

/** The boundary-evaluator batch hot path — O(n) in value count. */
export const boundaryEvaluateProbe: ComplexityProbe = {
  path: 'boundary.evaluateBatch',
  owner: '@liteship/core',
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
  owner: '@liteship/core',
  describe: 'contentAddressOf — canonicalize → CanonicalCbor → fnv1a; O(n) in element count.',
  shape: 'address-elements',
  sizes: [8, 32, 128, 512, 2048],
  workloadFor: buildContentAddressOfSize,
};

/** Canonical array encoding — O(n) in encoded element count. */
export const canonicalEncodeProbe: ComplexityProbe = {
  path: 'canonical.encode',
  owner: '@liteship/canonical',
  describe: 'CanonicalCbor.encode — one deterministic fold over array elements; O(n) in element count.',
  shape: 'canonical-array-elements',
  sizes: [64, 256, 1024, 4096, 16384],
  workloadFor: buildCanonicalEncodeOfSize,
};

/** Canonical array decoding — O(n) in encoded element count. */
export const canonicalDecodeProbe: ComplexityProbe = {
  path: 'canonical.decode',
  owner: '@liteship/canonical',
  describe: 'canonical decode — one strict cursor walk over encoded array elements; O(n) in element count.',
  shape: 'canonical-array-elements',
  sizes: [64, 256, 1024, 4096, 16384],
  workloadFor: buildCanonicalDecodeOfSize,
};

export const genuiValidationProbe: ComplexityProbe = {
  path: 'genui.validate',
  owner: '@liteship/genui',
  describe: 'validateGeneratedUITree — one structural visit per generated node; O(n) in node count.',
  shape: 'generated-ui-nodes',
  // Start above the timer/allocator noise floor while staying below GenUI's
  // bounded node budget. Five 2× steps still expose the complete linear curve.
  sizes: [256, 512, 1024, 2048, 4096],
  measurement: { innerIterations: 25, replicates: 7, warmupIterations: 10 },
  workloadFor: buildGenuiValidationOfSize,
};

export const genuiRenderHashProbe: ComplexityProbe = {
  path: 'genui.renderHash',
  owner: '@liteship/genui',
  describe: 'renderHash — canonical encoding and hashing of one generated tree; O(n) in node count.',
  shape: 'generated-ui-nodes',
  sizes: [32, 128, 512, 2048, 8192],
  measurement: { innerIterations: 8, replicates: 7, warmupIterations: 5 },
  workloadFor: buildGenuiRenderHashOfSize,
};

export const assetRiffWalkProbe: ComplexityProbe = {
  path: 'assets.walkRiff',
  owner: '@liteship/assets',
  describe: 'walkRiff — one bounded structural visit per declared RIFF chunk; O(n) in chunk count.',
  shape: 'riff-chunks',
  sizes: [32, 128, 512, 2048, 8192],
  measurement: { innerIterations: 25, replicates: 7, warmupIterations: 10 },
  workloadFor: buildRiffWalkOfSize,
};

export const assetWaveformProbe: ComplexityProbe = {
  path: 'assets.computeWaveform',
  owner: '@liteship/assets',
  describe: 'computeWaveform — one frame fold plus one fixed-bin normalization pass; O(n) in frame count.',
  shape: 'audio-frames',
  sizes: [65_536, 131_072, 262_144, 524_288, 1_048_576],
  measurement: { innerIterations: 5, replicates: 7, warmupIterations: 3 },
  workloadFor: buildWaveformOfSize,
};

export const assetOnsetsProbe: ComplexityProbe = {
  path: 'assets.detectOnsets',
  owner: '@liteship/assets',
  describe: 'detectOnsets — bounded frame, flux, and selection passes; O(n) in frame count.',
  shape: 'audio-frames',
  sizes: [65_536, 131_072, 262_144, 524_288, 1_048_576],
  measurement: { innerIterations: 4, replicates: 7, warmupIterations: 3 },
  workloadFor: buildOnsetsOfSize,
};

export const assetBeatsProbe: ComplexityProbe = {
  path: 'assets.detectBeats',
  owner: '@liteship/assets',
  describe: 'detectBeats — O(n * lagRange), linear in frame count at a fixed sample-rate lag range.',
  shape: 'audio-frames-fixed-sample-rate',
  sizes: [65_536, 131_072, 262_144, 524_288, 1_048_576],
  measurement: { innerIterations: 3, replicates: 7, warmupIterations: 2 },
  workloadFor: buildBeatsOfSize,
};

export const gauntletRunGatesProbe: ComplexityProbe = {
  path: 'gauntlet.runGates',
  owner: '@liteship/gauntlet',
  describe: 'runGates — one qualification and decision fold per gate; O(n) in gate count.',
  shape: 'qualified-gates',
  sizes: [8, 32, 128, 512, 2048],
  measurement: { innerIterations: 10, replicates: 7, warmupIterations: 5 },
  workloadFor: buildGauntletRunOfSize,
};

/** Every complexity probe the contract layer measures + maps. */
export const COMPLEXITY_PROBES: readonly ComplexityProbe[] = [
  boundaryEvaluateProbe,
  contentAddressProbe,
  canonicalEncodeProbe,
  canonicalDecodeProbe,
  genuiValidationProbe,
  genuiRenderHashProbe,
  assetRiffWalkProbe,
  assetWaveformProbe,
  assetOnsetsProbe,
  assetBeatsProbe,
  gauntletRunGatesProbe,
];

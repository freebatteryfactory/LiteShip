/**
 * Benchmark evidence admission — scientific results are immutable, addressed,
 * confidence-aware, and fresh for the exact source/environment that produced
 * them. An inconclusive measurement is never laundered into a pass.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import {
  admitBenchmarkEvidence,
  createBenchmarkEvidence,
  createBenchmarkEvidenceArtifact,
  parseBenchmarkEvidenceArtifact,
  parseBenchmarkEvidence,
  type BenchmarkEvidence,
  type BenchmarkEvidenceInput,
  type BenchmarkEvidenceAuthority,
  type ComplexityMap,
  type ComplexityProbe,
} from '../../../scripts/bench/contracts.ts';
import {
  projectComplexityBenchmarkEvidence,
  verifyBenchmarkEvidenceArtifact,
  type BenchmarkProducerIdentity,
} from '../../../scripts/bench-contracts.ts';

const SHA = 'a'.repeat(40);
const SOURCE_DIGEST = `sha256:${'b'.repeat(64)}` as const;
const ENVIRONMENT_DIGEST = `sha256:${'c'.repeat(64)}` as const;

function input(overrides: Partial<BenchmarkEvidenceInput> = {}): BenchmarkEvidenceInput {
  const base: BenchmarkEvidenceInput = {
    sut: {
      id: 'boundary.evaluate',
      owner: '@liteship/quantizer',
      benchmark: 'Boundary.evaluate — threshold sweep',
      file: 'tests/bench/core.bench.ts',
    },
    input: {
      dimensions: [{ name: 'threshold-count', unit: 'thresholds', distribution: 'powers-of-two' }],
      sizes: [8, 32, 128, 512, 2048],
    },
    measurement: {
      mode: 'warm',
      warmupIterations: 50,
      repetitions: 7,
      canaries: [{ id: 'boundary-quadratic-canary', verdict: 'pass' }],
    },
    environment: {
      sourceSha: SHA,
      sourceDigest: SOURCE_DIGEST,
      environmentDigest: ENVIRONMENT_DIGEST,
      platform: 'linux',
      arch: 'x64',
      runtime: 'node-22',
      toolchain: 'typescript-7-native',
    },
    complexity: {
      expected: 'O(n)',
      measured: 'O(n)',
      fittedSlope: 1.01,
      fittedR2: 0.99,
    },
    allocation: {
      observedBytes: 512,
      budgetBytes: 1_024,
      leakSlope: 0.01,
      maximumLeakSlope: 0.05,
    },
    confidence: {
      minimumR2: 0.9,
      coefficientOfVariation: 0.03,
      maximumCoefficientOfVariation: 0.1,
    },
  };
  return { ...base, ...overrides };
}

function authority(evidence: BenchmarkEvidence): BenchmarkEvidenceAuthority {
  return {
    sourceSha: evidence.environment.sourceSha,
    sourceDigest: evidence.environment.sourceDigest,
    environmentDigest: evidence.environment.environmentDigest,
    toolchain: evidence.environment.toolchain,
  };
}

describe('BenchmarkEvidence', () => {
  it('constructs one immutable SHA-addressed pass over complete scientific facts', () => {
    const source = input();
    const evidence = createBenchmarkEvidence(source);

    expect(evidence.evidenceId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(evidence.admission).toEqual({ disposition: 'pass', reasons: [] });
    expect(evidence.regressionDisposition).toBe('none');
    expect(admitBenchmarkEvidence(evidence, authority(evidence))).toEqual(evidence.admission);
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.input.dimensions)).toBe(true);

    (source.input.sizes as number[])[0] = 4;
    expect(evidence.input.sizes).toEqual([8, 32, 128, 512, 2048]);
  });

  it('classifies low R2 as unknown, never pass', () => {
    const evidence = createBenchmarkEvidence(
      input({
        complexity: { expected: 'O(n)', measured: 'O(n)', fittedSlope: 1, fittedR2: 0.4 },
      }),
    );
    expect(evidence.admission).toEqual({ disposition: 'unknown', reasons: ['low-r2'] });
    expect(evidence.regressionDisposition).toBe('inconclusive');
  });

  it('classifies unstable variance as unknown, never pass', () => {
    const evidence = createBenchmarkEvidence(
      input({
        confidence: {
          minimumR2: 0.9,
          coefficientOfVariation: 0.4,
          maximumCoefficientOfVariation: 0.1,
        },
      }),
    );
    expect(evidence.admission).toEqual({ disposition: 'unknown', reasons: ['unstable-variance'] });
  });

  it('classifies a single replicate as unknown because uncertainty is unobservable', () => {
    const evidence = createBenchmarkEvidence(
      input({
        measurement: {
          mode: 'warm',
          warmupIterations: 50,
          repetitions: 1,
          canaries: [{ id: 'boundary-quadratic-canary', verdict: 'pass' }],
        },
      }),
    );
    expect(evidence.admission).toEqual({ disposition: 'unknown', reasons: ['under-replicated'] });
    expect(evidence.regressionDisposition).toBe('inconclusive');
  });

  it('classifies a thin or non-geometric complexity sweep as unknown', () => {
    const thin = createBenchmarkEvidence(input({ input: { ...input().input, sizes: [8, 16, 32, 64] } }));
    expect(thin.admission).toEqual({ disposition: 'unknown', reasons: ['insufficient-size-sweep'] });

    const clustered = createBenchmarkEvidence(input({ input: { ...input().input, sizes: [8, 16, 24, 48, 96] } }));
    expect(clustered.admission).toEqual({ disposition: 'unknown', reasons: ['invalid-size-sweep'] });
  });

  it('refuses an evidence record that attempts to weaken the shared confidence policy', () => {
    expect(() =>
      createBenchmarkEvidence(
        input({
          confidence: {
            minimumR2: 0.5,
            coefficientOfVariation: 0.03,
            maximumCoefficientOfVariation: 0.25,
          },
        }),
      ),
    ).toThrow(/cannot weaken the claim-bearing floor/u);
  });

  it('keeps deterministic complexity, allocation, leak, and canary violations blocking', () => {
    const evidence = createBenchmarkEvidence(
      input({
        complexity: { expected: 'O(n)', measured: 'O(n^2)', fittedSlope: 2, fittedR2: 0.2 },
        allocation: { observedBytes: 2_048, budgetBytes: 1_024, leakSlope: 0.2, maximumLeakSlope: 0.05 },
        measurement: {
          mode: 'warm',
          warmupIterations: 50,
          repetitions: 7,
          canaries: [{ id: 'sut-invocation', verdict: 'fail' }],
        },
      }),
    );

    expect(evidence.admission.disposition).toBe('fail');
    expect(evidence.admission.reasons).toEqual([
      'canary-failed',
      'complexity-regression',
      'allocation-budget-exceeded',
      'leak-slope-exceeded',
    ]);
    expect(evidence.regressionDisposition).toBe('blocking');
  });

  it('refuses stale source and foreign environment/toolchain as unknown', () => {
    const evidence = createBenchmarkEvidence(input());
    expect(
      admitBenchmarkEvidence(evidence, {
        sourceSha: 'd'.repeat(40),
        sourceDigest: `sha256:${'e'.repeat(64)}`,
        environmentDigest: `sha256:${'f'.repeat(64)}`,
        toolchain: 'different-toolchain',
      }),
    ).toEqual({
      disposition: 'unknown',
      reasons: ['stale-source-sha', 'stale-source-digest', 'foreign-environment', 'foreign-toolchain'],
    });
  });

  it('strictly refuses foreign fields and changed addressed facts', () => {
    const evidence = createBenchmarkEvidence(input());
    expect(() => parseBenchmarkEvidence({ ...evidence, surprise: true })).toThrow(/foreign fields/u);
    expect(() =>
      parseBenchmarkEvidence({
        ...evidence,
        confidence: { ...evidence.confidence, coefficientOfVariation: 0.08 },
      }),
    ).toThrow(/evidenceId does not match/u);
  });

  it('changes the integrity witness when a behavior-bearing benchmark fact changes', () => {
    const baseline = createBenchmarkEvidence(input());
    const changedSut = createBenchmarkEvidence(input({ sut: { ...input().sut, id: 'boundary.evaluate.changed' } }));
    const changedInput = createBenchmarkEvidence(input({ input: { ...input().input, sizes: [8, 64, 512] } }));
    const changedEnvironment = createBenchmarkEvidence(
      input({ environment: { ...input().environment, toolchain: 'typescript-compat' } }),
    );

    expect(
      new Set([baseline.evidenceId, changedSut.evidenceId, changedInput.evidenceId, changedEnvironment.evidenceId]),
    ).toHaveLength(4);
  });

  it('refuses a forged pass over an inconclusive measurement', () => {
    const evidence = createBenchmarkEvidence(
      input({
        confidence: {
          minimumR2: 0.9,
          coefficientOfVariation: 0.4,
          maximumCoefficientOfVariation: 0.1,
        },
      }),
    );
    expect(() =>
      parseBenchmarkEvidence({
        ...evidence,
        admission: { disposition: 'pass', reasons: [] },
      }),
    ).toThrow(/admission does not match/u);
  });
});

describe('existing complexity producer → addressed evidence → admission', () => {
  const probe: ComplexityProbe = {
    path: 'boundary.evaluateBatch',
    owner: '@liteship/core',
    describe: 'fixture',
    shape: 'batch-values',
    sizes: [8, 16, 32, 64, 128],
    measurement: { innerIterations: 10, replicates: 7, warmupIterations: 2 },
    workloadFor: () => () => undefined,
  };
  const identity: BenchmarkProducerIdentity = {
    sourceSha: SHA,
    sourceDigest: SOURCE_DIGEST,
    environmentDigest: ENVIRONMENT_DIGEST,
    platform: 'linux',
    arch: 'x64',
    runtime: 'node-22',
    toolchain: 'node:v22',
  };

  function map(overrides: Partial<ComplexityMap['entries'][number]> = {}): ComplexityMap {
    return {
      schemaVersion: 2,
      entries: [
        {
          path: probe.path,
          describe: probe.describe,
          shape: probe.shape,
          sizes: probe.sizes,
          class: 'O(n)',
          fittedSlope: 1,
          fittedR2: 0.99,
          coefficientOfVariation: 0.03,
          measurement: { innerIterations: 10, replicates: 7, warmupIterations: 2 },
          ...overrides,
        },
      ],
    };
  }

  it('projects a real complexity-map entry into an addressed artifact and re-admits it', () => {
    const records = projectComplexityBenchmarkEvidence(map(), [probe], identity, 'pass');
    const artifact = createBenchmarkEvidenceArtifact(records);
    expect(artifact.artifactId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(parseBenchmarkEvidenceArtifact(JSON.parse(JSON.stringify(artifact)) as unknown)).toEqual(artifact);
    expect(verifyBenchmarkEvidenceArtifact(artifact, identity, [probe.path])).toEqual([]);
    expect(verifyBenchmarkEvidenceArtifact(artifact, identity, [])).toEqual([
      { path: probe.path, disposition: 'fail', reasons: ['unexpected addressed benchmark evidence'] },
    ]);
    expect(() => createBenchmarkEvidenceArtifact([records[0]!, records[0]!])).toThrow(/unique/u);
  });

  it('the producer consumer refuses failed, unknown, stale, foreign, and missing evidence', () => {
    const failed = createBenchmarkEvidenceArtifact(
      projectComplexityBenchmarkEvidence(map(), [probe], identity, 'fail'),
    );
    expect(verifyBenchmarkEvidenceArtifact(failed, identity, [probe.path])).toEqual([
      { path: probe.path, disposition: 'fail', reasons: ['canary-failed'] },
    ]);

    const lowConfidence = createBenchmarkEvidenceArtifact(
      projectComplexityBenchmarkEvidence(map({ fittedR2: 0.1 }), [probe], identity, 'pass'),
    );
    expect(verifyBenchmarkEvidenceArtifact(lowConfidence, identity, [probe.path])[0]).toMatchObject({
      disposition: 'unknown',
      reasons: ['low-r2'],
    });

    const unstable = createBenchmarkEvidenceArtifact(
      projectComplexityBenchmarkEvidence(map({ coefficientOfVariation: 0.9 }), [probe], identity, 'pass'),
    );
    expect(verifyBenchmarkEvidenceArtifact(unstable, identity, [probe.path])[0]).toMatchObject({
      disposition: 'unknown',
      reasons: ['unstable-variance'],
    });

    const healthy = createBenchmarkEvidenceArtifact(
      projectComplexityBenchmarkEvidence(map(), [probe], identity, 'pass'),
    );
    expect(
      verifyBenchmarkEvidenceArtifact(
        healthy,
        {
          sourceSha: 'd'.repeat(40),
          sourceDigest: `sha256:${'e'.repeat(64)}`,
          environmentDigest: `sha256:${'f'.repeat(64)}`,
          toolchain: 'foreign',
        },
        [probe.path, 'missing.path'],
      ),
    ).toEqual([
      {
        path: probe.path,
        disposition: 'unknown',
        reasons: ['stale-source-sha', 'stale-source-digest', 'foreign-environment', 'foreign-toolchain'],
      },
      { path: 'missing.path', disposition: 'missing', reasons: ['missing addressed benchmark evidence'] },
    ]);
  });

  it('refuses variance-free producer output instead of inventing confidence', () => {
    expect(() =>
      projectComplexityBenchmarkEvidence(map({ coefficientOfVariation: undefined }), [probe], identity, 'pass'),
    ).toThrow(/no variance measurement/u);
  });
});

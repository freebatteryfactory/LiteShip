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
  parseBenchmarkEvidence,
  type BenchmarkEvidence,
  type BenchmarkEvidenceInput,
  type BenchmarkEvidenceAuthority,
} from '../../../scripts/bench/contracts.ts';

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
      sizes: [8, 32, 128, 512],
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
    expect(evidence.input.sizes).toEqual([8, 32, 128, 512]);
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

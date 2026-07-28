/**
 * Web benchmark ownership is admitted only when the executed callback reaches
 * the real streaming kernel and the measured linear/backpressure laws hold.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { IntegrityDigest } from '@liteship/canonical';
import type { SSEMessage } from '@liteship/web';
import { qualifyBenchDistribution } from '../../packages/audit/src/benchmark-subject-facts.js';
import { COMPLEXITY_ADMISSION_POLICY } from '../../packages/gauntlet/src/gates/performance-contracts.js';
import { applyOverflow } from '../../packages/web/src/stream/sse-pure.js';
import {
  admitBenchmarkEvidence,
  createBenchmarkEvidence,
  fitGrowthClass,
  readDistributionRegistry,
  type BenchmarkEvidence,
  type BenchmarkEvidenceAuthority,
  type BenchmarkEvidenceInput,
} from '../../scripts/bench/contracts.js';
import { projectBenchmarkOwnerCoverage } from '../../scripts/bench/contract-coverage.js';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { repoRoot } from '../../vitest.shared.js';

const BENCH_FILE = 'tests/bench/web.bench.ts';
const OVERFLOW_BENCH = 'web applyOverflow -- 256 saturated keyed patches';
const PARSE_BENCH = 'web parseMessage -- 8192-byte patch payload';
const SOURCE_SHA = 'b'.repeat(40);
const ENVIRONMENT_DIGEST = `sha256:${'f'.repeat(64)}` as IntegrityDigest;

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

function sha256(text: string): IntegrityDigest {
  return `sha256:${createHash('sha256').update(text).digest('hex')}` as IntegrityDigest;
}

function liveWebDistributions() {
  const registry = readDistributionRegistry(repoRoot);
  if (registry === null) throw new TypeError('benchmark distribution registry must parse');
  return registry.distributions.filter((entry) => entry.file === BENCH_FILE);
}

function authority(evidence: BenchmarkEvidence): BenchmarkEvidenceAuthority {
  return {
    sourceSha: evidence.environment.sourceSha,
    sourceDigest: evidence.environment.sourceDigest,
    environmentDigest: evidence.environment.environmentDigest,
    toolchain: evidence.environment.toolchain,
  };
}

function webEvidence(overrides: Partial<BenchmarkEvidenceInput> = {}): BenchmarkEvidence {
  const input: BenchmarkEvidenceInput = {
    sut: {
      id: 'web.sse.apply-overflow',
      owner: '@liteship/web',
      benchmark: OVERFLOW_BENCH,
      file: BENCH_FILE,
    },
    input: {
      dimensions: [
        {
          name: 'pending-message-count',
          unit: 'messages',
          distribution: 'geometric-saturated-keyed-buffer',
        },
      ],
      sizes: [256, 512, 1024, 2048, 4096],
    },
    measurement: {
      mode: 'warm',
      warmupIterations: 20,
      repetitions: 7,
      canaries: [{ id: 'coalesce-or-evict-result-observed', verdict: 'pass' }],
    },
    environment: {
      sourceSha: SOURCE_SHA,
      sourceDigest: sha256(source(BENCH_FILE)),
      environmentDigest: ENVIRONMENT_DIGEST,
      platform: 'portable-operation-count',
      arch: 'deterministic',
      runtime: 'vitest',
      toolchain: 'typescript-parser-qualified',
    },
    complexity: { expected: 'O(n)', measured: 'O(n)', fittedSlope: 1, fittedR2: 1 },
    allocation: null,
    confidence: {
      minimumR2: COMPLEXITY_ADMISSION_POLICY.minimumR2,
      coefficientOfVariation: 0.02,
      maximumCoefficientOfVariation: COMPLEXITY_ADMISSION_POLICY.maximumCoefficientOfVariation,
    },
  };
  return createBenchmarkEvidence({ ...input, ...overrides });
}

function countedPatch(id: string, reads: { value: number }): SSEMessage {
  return {
    get type() {
      reads.value += 1;
      return 'patch' as const;
    },
    data: { id, html: `<div>${id}</div>` },
  };
}

function measuredOverflowReads(size: number): number {
  const reads = { value: 0 };
  const buffer = Array.from({ length: size }, (_, index) => countedPatch(`slot-${index}`, reads));
  const result = applyOverflow(buffer, countedPatch('incoming', reads), 'coalesce-by-id', size);
  expect(result).toMatchObject({ dropped: 1, coalesced: 0, saturated: true });
  expect(result.buffer).toHaveLength(size);
  return reads.value;
}

describe('Web benchmark admission laws', () => {
  it('qualifies both executed Web callbacks and attributes them to production source ownership', () => {
    const distributions = liveWebDistributions();
    expect(distributions.map((entry) => entry.name).sort()).toEqual([OVERFLOW_BENCH, PARSE_BENCH].sort());
    for (const distribution of distributions) {
      const qualification = qualifyBenchDistribution(distribution, source);
      expect(qualification.issues).toEqual([]);
      expect(qualification.qualifyingSutSubjects).toEqual([
        expect.objectContaining({
          role: 'sut',
          origin: { kind: 'file', path: 'packages/web/src/stream/sse-pure.ts' },
        }),
      ]);
    }

    const registry = readDistributionRegistry(repoRoot)!;
    expect(projectBenchmarkOwnerCoverage(PACKAGE_CATALOG, registry.distributions, []).find(
      (entry) => entry.packageName === '@liteship/web',
    )).toMatchObject({ status: 'covered', distributionCount: 2 });
  });

  it('rejects a no-op benchmark body even when it retains the subject import', () => {
    const distribution = liveWebDistributions().find((entry) => entry.name === OVERFLOW_BENCH)!;
    const noOp = [
      "import { applyOverflow } from '../../packages/web/src/stream/sse-pure.js';",
      `bench.add('${OVERFLOW_BENCH}', () => saturatedBuffer.length);`,
      'void applyOverflow;',
    ].join('\n');
    expect(qualifyBenchDistribution(distribution, (path) => (path === BENCH_FILE ? noOp : source(path))).issues)
      .toContainEqual(expect.objectContaining({ kind: 'uninvoked-subject' }));
  });

  it('measures the live saturated-buffer scan as linear and makes the result behavior-sensitive', () => {
    const sizes = [256, 512, 1024, 2048, 4096];
    const samples = sizes.map((size) => ({ size, cost: measuredOverflowReads(size) }));
    const fit = fitGrowthClass(samples);
    expect(fit.class).toBe('O(n)');
    expect(fit.r2).toBeGreaterThanOrEqual(COMPLEXITY_ADMISSION_POLICY.minimumR2);

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 256 }), (size) => {
        const reads = measuredOverflowReads(size);
        expect(reads).toBeGreaterThan(size);
        expect(reads).toBeLessThanOrEqual(2 * size + 4);
      }),
      { seed: 0x5e_55_0f_10, numRuns: 80 },
    );
  });

  it('turns a planted quadratic replacement into a blocking complexity regression', () => {
    const sizes = [256, 512, 1024, 2048, 4096];
    const planted = fitGrowthClass(sizes.map((size) => ({ size, cost: size * size })));
    expect(planted.class).toBe('O(n^2)');
    const evidence = webEvidence({
      complexity: {
        expected: 'O(n)',
        measured: planted.class,
        fittedSlope: planted.slope,
        fittedR2: planted.r2,
      },
    });
    expect(evidence.admission).toEqual({ disposition: 'fail', reasons: ['complexity-regression'] });
  });

  it('admits only fresh, sufficiently replicated, stable evidence', () => {
    const evidence = webEvidence();
    expect(evidence.admission).toEqual({ disposition: 'pass', reasons: [] });
    expect(admitBenchmarkEvidence(evidence, authority(evidence))).toEqual(evidence.admission);

    expect(webEvidence({ measurement: { ...evidence.measurement, repetitions: 6 } }).admission).toEqual({
      disposition: 'unknown',
      reasons: ['under-replicated'],
    });
    expect(webEvidence({ confidence: { ...evidence.confidence, coefficientOfVariation: 0.5 } }).admission).toEqual({
      disposition: 'unknown',
      reasons: ['unstable-variance'],
    });
    expect(
      admitBenchmarkEvidence(evidence, { ...authority(evidence), sourceDigest: sha256('stale web bench') }),
    ).toEqual({ disposition: 'unknown', reasons: ['stale-source-digest'] });
  });
});

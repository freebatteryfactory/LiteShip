import { describe, expect, it } from 'vitest';
import { IntegrityDigest } from '@liteship/core';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import {
  admitVerifiedArtifactIdentity,
  buildDeliveryMetrics,
  parseDeliveryMetrics,
} from '../../../scripts/lib/delivery-metrics.js';
import { buildChangeIntent } from '../../../scripts/lib/change-intent.js';
import { semanticSha256 } from '../../../scripts/lib/delivery-evidence-schema.js';
import { createBenchmarkEvidence, createBenchmarkEvidenceArtifact } from '../../../scripts/bench/contracts.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import type { AssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';

const inventory: AssuranceInventory = {
  schemaVersion: 4,
  packages: PACKAGE_CATALOG.map((record) => ({
    name: record.name,
    sourceLoc: 1,
    authoredEvidenceLoc: 1,
    generatedEvidenceLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    targetReached: false,
    highestAssurance: 'L1',
    evidenceRequirements: ['unit'],
    missingEvidence: [],
    evidenceClasses: {
      unit: 1,
      property: 0,
      component: 0,
      integration: 0,
      regression: 0,
      browser: 0,
      e2e: 0,
      fuzz: 0,
      simulation: 0,
      mutation: 0,
      mcdc: 0,
      chaos: 0,
      benchmark: 0,
    },
    evidenceFiles: [],
  })),
  evidenceOwnership: {
    packageFiles: [],
    repositoryTooling: { owner: 'repository/tooling', authoredEvidenceLoc: 0, generatedEvidenceLoc: 0, files: [] },
  },
  nodeTestSelection: { entrypoints: [], dependents: [] },
  totals: {
    sourceLoc: 25,
    authoredEvidenceLoc: 25,
    generatedEvidenceLoc: 0,
    corpusLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    sourceRoles: { product: 25, verificationEngine: 0, rustWasm: 0, workflowAuthority: 0, generated: 0 },
  },
};

const plan = planAffectedTests(['packages/core/src/index.ts'], PACKAGE_CATALOG, inventory, {
  baseRef: 'origin/main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  confidence: 'high',
  selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
});

const intent = buildChangeIntent({
  schemaVersion: 2,
  sponsor: { value: { login: 'heyoub', ownership: 'repository-owner' }, provenance: 'github-verified' },
  hypothesis: { value: 'Measure library delivery health.', provenance: 'agent-self-declared' },
  affectedUserSurface: {
    value: { visibility: 'internal', areas: ['delivery evidence'] },
    provenance: 'agent-self-declared',
  },
  expectedOutcome: { value: 'Current evidence produces bounded classifications.', provenance: 'agent-self-declared' },
  guardrails: { value: ['do not invent deployment metrics'], provenance: 'agent-self-declared' },
  reversibility: {
    value: { kind: 'reversible', rollback: 'Revert the metrics projection.' },
    provenance: 'agent-self-declared',
  },
  actorClass: { value: 'human', provenance: 'agent-self-declared' },
  uncertainty: { value: { level: 'low', unknowns: [] }, provenance: 'agent-self-declared' },
  sourceSha: { value: plan.headSha, provenance: 'github-verified' },
  repositoryIdentity: {
    value: { host: 'github.com', owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_delivery' },
    provenance: 'github-verified',
  },
  execution: { value: null, provenance: 'agent-self-declared' },
});

const timeline = {
  sourceSha: plan.headSha,
  planId: plan.planId,
  committedAt: '2026-07-24T12:00:00.000Z',
  firstEvidenceAt: '2026-07-24T12:00:30.000Z',
  lastEvidenceAt: '2026-07-24T12:01:00.000Z',
  failureAt: null,
  recoveredAt: null,
  reviewStartedAt: '2026-07-24T12:00:10.000Z',
  reviewCompletedAt: '2026-07-24T12:00:20.000Z',
  batchStartedAt: '2026-07-24T12:00:30.000Z',
  batchCompletedAt: '2026-07-24T12:01:00.000Z',
} as const;

const base = () =>
  ({
    plan,
    reports: [],
    timings: { queueMs: 1_000, feedbackLatencyMs: 60_000, buildMs: 10_000, testMs: 20_000, totalComputeMs: 40_000 },
    jobAttempts: 10,
    reruns: 0,
    knownFlakyReruns: 0,
    flakeAttempts: 30,
    requiredEvidence: 10,
    presentEvidence: 10,
    escapedDefects: 0,
    artifactMismatches: 0,
    selectorMisses: 0,
    flakeEvidenceId: `sha256:${'d'.repeat(64)}` as const,
    changeIntent: intent,
    timeline,
  }) as const;

describe('delivery metrics and SLO fold', () => {
  it('is deterministic and accepts complete evidence inside every SLO', () => {
    const first = buildDeliveryMetrics(base());
    const second = buildDeliveryMetrics(base());
    expect(second).toEqual(first);
    expect(first.metricsId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.verdict).toBe('within-slo');
    expect(first.evidenceCompleteness).toBe(1);
    expect(first.evidenceCoverage).toEqual({ present: 10, required: 10, missing: 0 });
    expect(first.evidenceSources).toEqual({
      selectorCalibrationId: plan.selectorCalibrationId,
      flakeEvidenceId: `sha256:${'d'.repeat(64)}`,
    });
    expect(first.health).toMatchObject({
      scope: { kind: 'library', packages: [...plan.affectedPackages].sort() },
      intentId: intent.intentId,
      feedback: { classification: 'known', milliseconds: 60_000, slo: 'pass' },
      commitToEvidence: { classification: 'known', milliseconds: 60_000 },
      failureRecovery: { classification: 'unknown', milliseconds: null },
      reviewBatch: { classification: 'single-batch', reviewMs: 10_000, batchMs: 30_000 },
      quickCureCache: { classification: 'unknown' },
      compute: { classification: 'measured', totalMinutes: 2 / 3 },
      benchmark: { classification: 'unknown', artifactId: null },
    });
  });

  it('reports every violated SLO instead of averaging failures away', () => {
    const metrics = buildDeliveryMetrics({
      ...base(),
      timings: { ...base().timings, feedbackLatencyMs: 31 * 60_000 },
      reruns: 2,
      knownFlakyReruns: 2,
      flakeAttempts: 10,
      presentEvidence: 9,
      escapedDefects: 1,
      artifactMismatches: 1,
      selectorMisses: 1,
    });
    expect(metrics.verdict).toBe('outside-slo');
    expect(Object.values(metrics.slos)).toEqual(['fail', 'fail', 'fail', 'fail', 'fail', 'fail']);
  });

  it('never turns missing retrospective telemetry into a passing SLO', () => {
    const metrics = buildDeliveryMetrics({
      ...base(),
      knownFlakyReruns: null,
      flakeAttempts: null,
      requiredEvidence: null,
      presentEvidence: null,
      escapedDefects: null,
      artifactMismatches: null,
      selectorMisses: null,
      flakeEvidenceId: null,
      changeIntent: null,
      timeline: null,
    });
    expect(metrics.verdict).toBe('insufficient-evidence');
    expect(metrics.slos).toMatchObject({
      zeroFalseGreen: 'unknown',
      evidenceComplete: 'unknown',
      flakesBounded: 'unknown',
      artifactIdentity: 'unknown',
      selectorWithinBudget: 'unknown',
    });
    expect(metrics.health).toMatchObject({
      intentId: null,
      commitToEvidence: { classification: 'unknown', milliseconds: null },
      failureRecovery: { classification: 'unknown', milliseconds: null },
      reviewBatch: { classification: 'unknown', reviewMs: null, batchMs: null },
      quickCureCache: { classification: 'unknown' },
      benchmark: { classification: 'unknown' },
    });
  });

  it('classifies quick execution, cache service, rebatching, and explicit failure recovery from owned evidence', () => {
    const quickReport = {
      profile: 'quick' as const,
      platform: 'linux' as const,
      context: 'repository' as const,
      ok: true,
      blocked: false,
      results: [
        { id: 'check/typecheck', verdict: 'pass' as const, durationMs: 0, cacheHit: true, findings: [] },
        { id: 'check/test', verdict: 'pass' as const, durationMs: 25, cacheHit: false, findings: [] },
      ],
      curePackets: [],
    };
    const metrics = buildDeliveryMetrics({
      ...base(),
      reports: [quickReport],
      reruns: 1,
      timeline: {
        ...timeline,
        failureAt: '2026-07-24T12:00:35.000Z',
        recoveredAt: '2026-07-24T12:00:50.000Z',
      },
    });
    expect(metrics.health.quickCureCache).toMatchObject({
      classification: 'mixed-cache',
      executed: 2,
      cacheHits: 1,
    });
    expect(metrics.health.failureRecovery).toEqual({ classification: 'recovered', milliseconds: 15_000 });
    expect(metrics.health.reviewBatch.classification).toBe('rebatch');
  });

  it('reuses benchmark admission so current evidence passes and stale source evidence remains unknown', () => {
    const owner = plan.affectedPackages[0]!;
    const benchmark = (sourceSha: string) =>
      createBenchmarkEvidence({
        sut: { id: `${owner}/hot-path`, owner, benchmark: 'hot path', file: 'tests/bench/core.bench.ts' },
        input: {
          dimensions: [{ name: 'items', unit: 'count', distribution: 'linear' }],
          sizes: [1, 2, 4, 8, 16],
        },
        measurement: {
          mode: 'warm',
          warmupIterations: 1,
          repetitions: 7,
          canaries: [{ id: 'invokes-sut', verdict: 'pass' }],
        },
        environment: {
          sourceSha,
          sourceDigest: IntegrityDigest(`sha256:${'1'.repeat(64)}`),
          environmentDigest: IntegrityDigest(`sha256:${'2'.repeat(64)}`),
          platform: 'linux',
          arch: 'x64',
          runtime: 'node',
          toolchain: 'typescript',
        },
        complexity: { expected: 'O(n)', measured: 'O(n)', fittedSlope: 1, fittedR2: 0.99 },
        allocation: null,
        confidence: {
          minimumR2: 0.9,
          coefficientOfVariation: 0.01,
          maximumCoefficientOfVariation: 0.1,
          minimumObservedBatchDurationMs: 20,
          minimumTimedBatchDurationMs: 10,
        },
      });
    const authority = {
      sourceSha: plan.headSha,
      sourceDigest: IntegrityDigest(`sha256:${'1'.repeat(64)}`),
      environmentDigest: IntegrityDigest(`sha256:${'2'.repeat(64)}`),
      toolchain: 'typescript',
    };
    const current = buildDeliveryMetrics({
      ...base(),
      benchmarkEvidence: { artifact: createBenchmarkEvidenceArtifact([benchmark(plan.headSha)]), authority },
    });
    expect(current.health.benchmark).toMatchObject({ classification: 'pass', reasons: [] });

    const stale = buildDeliveryMetrics({
      ...base(),
      benchmarkEvidence: { artifact: createBenchmarkEvidenceArtifact([benchmark('a'.repeat(40))]), authority },
    });
    expect(stale.health.benchmark).toMatchObject({
      classification: 'unknown',
      reasons: ['stale-source-sha'],
    });
  });

  it('refuses impossible evidence counts', () => {
    expect(() => buildDeliveryMetrics({ ...base(), presentEvidence: 11 })).toThrow(/exceeds required/);
    expect(() => buildDeliveryMetrics({ ...base(), flakeEvidenceId: 'sha256:wrong' as never })).toThrow(
      /flakeEvidenceId/u,
    );
    expect(() => buildDeliveryMetrics({ ...base(), timeline: { ...timeline, sourceSha: 'e'.repeat(40) } })).toThrow(
      /foreign head/u,
    );
    expect(() =>
      buildDeliveryMetrics({ ...base(), timeline: { ...timeline, planId: `sha256:${'e'.repeat(64)}` } }),
    ).toThrow(/stale for the affected plan/u);
    expect(() =>
      buildDeliveryMetrics({
        ...base(),
        timeline: { ...timeline, failureAt: null, recoveredAt: '2026-07-24T12:00:50.000Z' },
      }),
    ).toThrow(/no preceding failure/u);
  });

  it('serializes the required and missing complement beside the present evidence numerator', () => {
    const metrics = buildDeliveryMetrics({ ...base(), presentEvidence: 9 });
    expect(metrics.evidenceCoverage).toEqual({ present: 9, required: 10, missing: 1 });
    expect(metrics.evidenceCompleteness).toBe(0.9);
  });

  it('refuses numerator-only, missing-complement, and non-closing evidence coverage', () => {
    const metrics = buildDeliveryMetrics(base());
    const candidate = metrics as typeof metrics & {
      readonly evidenceCoverage?: Readonly<Record<string, number>>;
    };
    const { evidenceCoverage: _removed, ...numeratorOnly } = candidate;
    expect(() => parseDeliveryMetrics(numeratorOnly)).toThrow(/delivery metrics keys/u);

    expect(() =>
      parseDeliveryMetrics({
        ...metrics,
        evidenceCoverage: { present: 10, required: 10 },
      }),
    ).toThrow(/evidence coverage.*keys/u);
    expect(() =>
      parseDeliveryMetrics({
        ...metrics,
        evidenceCoverage: { present: 9, required: 10, missing: 0 },
      }),
    ).toThrow(/evidence coverage.*close/u);
  });

  it('refuses a re-addressed passing SLO whose evidence rate contradicts its coverage', () => {
    const metrics = buildDeliveryMetrics(base());
    const { metricsId: _metricsId, ...unsignedMetrics } = metrics;
    const unsigned = { ...unsignedMetrics, evidenceCompleteness: 0 };
    const forged = { ...unsigned, metricsId: semanticSha256(unsigned) };

    expect(() => parseDeliveryMetrics(forged)).toThrow(/evidence completeness.*coverage/u);
  });

  it('re-addresses artifact identity only after standalone admission', () => {
    const candidate = buildDeliveryMetrics({ ...base(), artifactMismatches: null });
    const admitted = admitVerifiedArtifactIdentity(candidate);
    expect(admitted.metricsId).not.toBe(candidate.metricsId);
    expect(admitted.slos.artifactIdentity).toBe('pass');
    expect(admitted.slos.zeroFalseGreen).toBe(candidate.slos.zeroFalseGreen);
    expect(() => admitVerifiedArtifactIdentity(admitted)).toThrow(/must be unknown/u);
    expect(() => admitVerifiedArtifactIdentity({ ...candidate, headSha: 'c'.repeat(40) })).toThrow(/identity/u);
  });

  it('strictly parses every nested metrics field and recomputes its identity', () => {
    const metrics = buildDeliveryMetrics(base());
    expect(parseDeliveryMetrics(JSON.parse(JSON.stringify(metrics)) as unknown)).toEqual(metrics);
    expect(() => parseDeliveryMetrics({ ...metrics, timings: { ...metrics.timings, buildMs: -1 } })).toThrow(
      /buildMs/u,
    );
    expect(() =>
      parseDeliveryMetrics({ ...metrics, selectionWidth: { ...metrics.selectionWidth, foreign: 1 } }),
    ).toThrow(/selectionWidth keys/u);
    expect(() => parseDeliveryMetrics({ ...metrics, slos: { ...metrics.slos, artifactIdentity: 'unknown' } })).toThrow(
      /verdict|identity/u,
    );
    expect(() =>
      parseDeliveryMetrics({
        ...metrics,
        health: {
          ...metrics.health,
          compute: { ...metrics.health.compute, perChangedPathMinutes: 99 },
        },
      }),
    ).toThrow(/per-path compute/u);
    expect(() =>
      parseDeliveryMetrics({
        ...metrics,
        health: {
          ...metrics.health,
          benchmark: { classification: 'pass', artifactId: null, reasons: [] },
        },
      }),
    ).toThrow(/benchmark classification/u);
  });
});

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildDeliveryMetrics } from '../../scripts/lib/delivery-metrics.js';
import type { AffectedTestPlan } from '../../scripts/lib/affected-test-plan.js';

const RUNS = { numRuns: 72, seed: 0xd311 } as const;
const HEAD = 'b'.repeat(40);
const PLAN_ID = `sha256:${'c'.repeat(64)}` as const;

const plan: AffectedTestPlan = {
  schemaVersion: 4,
  planId: PLAN_ID,
  base: { ref: 'origin/main', sha: 'a'.repeat(40) },
  headSha: HEAD,
  changedPathDigest: `sha256:${'d'.repeat(64)}`,
  mode: 'focused',
  reason: 'property fixture',
  confidence: 'high',
  selectorCalibrationId: `sha256:${'e'.repeat(64)}`,
  rationale: [],
  changedPaths: ['packages/core/src/index.ts'],
  affectedPackages: ['@liteship/core'],
  risk: { level: 'high', highestAssurance: 'L4', factors: ['L4-authority'] },
  requiredChecks: ['check/test'],
  testFiles: ['tests/unit/core/content-address.test.ts'],
  testPartitions: { node: ['tests/unit/core/content-address.test.ts'], benchmark: [], browserRequired: false },
  browserRequired: false,
  benchmarkRequired: false,
  rustWasmRequired: false,
  platforms: ['linux'],
  prerequisites: [],
  artifacts: ['affected-plan', 'test-results'],
  estimatedCost: { selectedNodeTests: 1, upperBoundMs: 60_000 },
};

function input(
  options: {
    readonly feedbackMs?: number;
    readonly totalComputeMs?: number;
    readonly cacheHits?: readonly boolean[];
    readonly reruns?: number;
    readonly timeline?: null | {
      readonly sourceSha: string;
      readonly planId: AffectedTestPlan['planId'];
      readonly committedAt: string | null;
      readonly firstEvidenceAt: string | null;
      readonly lastEvidenceAt: string | null;
      readonly failureAt: string | null;
      readonly recoveredAt: string | null;
      readonly reviewStartedAt: string | null;
      readonly reviewCompletedAt: string | null;
      readonly batchStartedAt: string | null;
      readonly batchCompletedAt: string | null;
    };
  } = {},
) {
  const cacheHits = options.cacheHits ?? [];
  const reports =
    cacheHits.length === 0
      ? []
      : [
          {
            profile: 'quick' as const,
            platform: 'linux' as const,
            context: 'repository' as const,
            ok: true,
            blocked: false,
            results: cacheHits.map((cacheHit, index) => ({
              id: `check/property-${index}`,
              verdict: 'pass' as const,
              durationMs: cacheHit ? 0 : 1,
              cacheHit,
              findings: [],
            })),
            curePackets: [],
          },
        ];
  return {
    plan,
    reports,
    timings: {
      queueMs: 0,
      feedbackLatencyMs: options.feedbackMs ?? 1_000,
      buildMs: 0,
      testMs: 0,
      totalComputeMs: options.totalComputeMs ?? 60_000,
    },
    jobAttempts: 1,
    reruns: options.reruns ?? 0,
    knownFlakyReruns: null,
    flakeAttempts: null,
    requiredEvidence: null,
    presentEvidence: null,
    escapedDefects: null,
    artifactMismatches: null,
    selectorMisses: null,
    flakeEvidenceId: null,
    timeline: options.timeline ?? null,
  };
}

describe('delivery-health evidence classification laws', () => {
  it('is deterministic and derives feedback, cache, batch, and compute classifications from owned facts', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 4_000_000 }),
        fc.nat({ max: 20_000_000 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
        fc.nat({ max: 4 }),
        (feedbackMs, totalComputeMs, cacheHits, reruns) => {
          const start = Date.parse('2026-07-24T12:00:00.000Z');
          const timeline = {
            sourceSha: HEAD,
            planId: PLAN_ID,
            committedAt: new Date(start).toISOString(),
            firstEvidenceAt: new Date(start + 10).toISOString(),
            lastEvidenceAt: new Date(start + 10 + feedbackMs).toISOString(),
            failureAt: null,
            recoveredAt: null,
            reviewStartedAt: null,
            reviewCompletedAt: null,
            batchStartedAt: new Date(start + 10).toISOString(),
            batchCompletedAt: new Date(start + 10 + feedbackMs).toISOString(),
          } as const;
          const candidate = input({ feedbackMs, totalComputeMs, cacheHits, reruns, timeline });
          const first = buildDeliveryMetrics(candidate);
          const second = buildDeliveryMetrics(candidate);
          expect(second).toEqual(first);
          expect(first.health.feedback).toEqual({
            classification: 'known',
            milliseconds: feedbackMs,
            slo: feedbackMs <= 30 * 60_000 ? 'pass' : 'fail',
          });
          expect(first.health.compute.totalMinutes).toBe(totalComputeMs / 60_000);
          expect(first.health.reviewBatch.classification).toBe(reruns === 0 ? 'single-batch' : 'rebatch');
          expect(first.health.quickCureCache.classification).toBe(
            cacheHits.every(Boolean) ? 'cache-served' : cacheHits.some(Boolean) ? 'mixed-cache' : 'executed',
          );
        },
      ),
      RUNS,
    );
  });

  it('keeps missing timeline, quick, failure, intent, and benchmark evidence unknown', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000 }), (feedbackMs) => {
        const metrics = buildDeliveryMetrics(input({ feedbackMs, timeline: null, cacheHits: [] }));
        expect(metrics.health.intentId).toBeNull();
        expect(metrics.health.commitToEvidence.classification).toBe('unknown');
        expect(metrics.health.failureRecovery.classification).toBe('unknown');
        expect(metrics.health.reviewBatch.classification).toBe('unknown');
        expect(metrics.health.quickCureCache.classification).toBe('unknown');
        expect(metrics.health.benchmark.classification).toBe('unknown');
      }),
      RUNS,
    );
  });

  it('refuses foreign heads, stale plan identities, and backwards evidence intervals', () => {
    fc.assert(
      fc.property(fc.constantFrom('foreign-head', 'stale-plan', 'backwards'), (fault) => {
        const baseTime = Date.parse('2026-07-24T12:00:00.000Z');
        const timeline = {
          sourceSha: fault === 'foreign-head' ? 'f'.repeat(40) : HEAD,
          planId: fault === 'stale-plan' ? (`sha256:${'f'.repeat(64)}` as const) : PLAN_ID,
          committedAt: new Date(baseTime).toISOString(),
          firstEvidenceAt: new Date(baseTime + 2_000).toISOString(),
          lastEvidenceAt: new Date(fault === 'backwards' ? baseTime + 1_000 : baseTime + 3_000).toISOString(),
          failureAt: null,
          recoveredAt: null,
          reviewStartedAt: null,
          reviewCompletedAt: null,
          batchStartedAt: null,
          batchCompletedAt: null,
        };
        expect(() => buildDeliveryMetrics(input({ timeline }))).toThrow(
          fault === 'foreign-head' ? /foreign head/u : fault === 'stale-plan' ? /stale/u : /completion precedes/u,
        );
      }),
      RUNS,
    );
  });
});

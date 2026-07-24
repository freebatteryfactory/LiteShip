import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { buildDeliveryMetrics } from '../../../scripts/lib/delivery-metrics.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import type { AssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';

const inventory: AssuranceInventory = {
  schemaVersion: 2,
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

const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory, {
  baseRef: 'origin/main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  confidence: 'high',
});

const base = () =>
  ({
    plan,
    reports: [],
    timings: { queueMs: 1_000, feedbackLatencyMs: 60_000, buildMs: 10_000, testMs: 20_000, totalComputeMs: 40_000 },
    jobAttempts: 10,
    reruns: 0,
    knownFlakyReruns: 0,
    requiredEvidence: 10,
    presentEvidence: 10,
    escapedDefects: 0,
    artifactMismatches: 0,
    selectorMisses: 0,
  }) as const;

describe('delivery metrics and SLO fold', () => {
  it('is deterministic and accepts complete evidence inside every SLO', () => {
    const first = buildDeliveryMetrics(base());
    const second = buildDeliveryMetrics(base());
    expect(second).toEqual(first);
    expect(first.metricsId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.verdict).toBe('within-slo');
    expect(first.evidenceCompleteness).toBe(1);
  });

  it('reports every violated SLO instead of averaging failures away', () => {
    const metrics = buildDeliveryMetrics({
      ...base(),
      timings: { ...base().timings, feedbackLatencyMs: 31 * 60_000 },
      reruns: 2,
      knownFlakyReruns: 2,
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
      requiredEvidence: null,
      presentEvidence: null,
      escapedDefects: null,
      artifactMismatches: null,
      selectorMisses: null,
    });
    expect(metrics.verdict).toBe('insufficient-evidence');
    expect(metrics.slos).toMatchObject({
      zeroFalseGreen: 'unknown',
      evidenceComplete: 'unknown',
      flakesBounded: 'unknown',
      artifactIdentity: 'unknown',
      selectorWithinBudget: 'unknown',
    });
  });

  it('refuses impossible evidence counts', () => {
    expect(() => buildDeliveryMetrics({ ...base(), presentEvidence: 11 })).toThrow(/exceeds required/);
  });
});

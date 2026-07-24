/** Deterministic delivery metrics and SLO fold over addressed plan/check evidence. @module */

import { createHash } from 'node:crypto';
import type { CheckReport } from '../../packages/command/src/checks/plan.js';
import type { AffectedTestPlan } from './affected-test-plan.js';

export const DELIVERY_SLOS = {
  falseGreenMax: 0,
  requiredEvidenceCompletenessMin: 1,
  feedbackLatencyMsMax: 30 * 60_000,
  flakeRateMax: 0.01,
  artifactMismatchMax: 0,
  selectorMissMax: 0,
} as const;

export interface DeliveryTimingInput {
  readonly queueMs: number;
  readonly feedbackLatencyMs: number;
  readonly buildMs: number;
  readonly testMs: number;
  readonly totalComputeMs: number;
}

export interface DeliveryMetricsInput {
  readonly plan: AffectedTestPlan;
  readonly reports: readonly CheckReport[];
  readonly timings: DeliveryTimingInput;
  readonly jobAttempts: number;
  readonly reruns: number;
  /** Retries independently classified as flakes; null when no classifier evidence exists. */
  readonly knownFlakyReruns: number | null;
  /** Required evidence item count; null until an addressed evidence manifest is supplied. */
  readonly requiredEvidence: number | null;
  /** Present evidence item count; null until an addressed evidence manifest is supplied. */
  readonly presentEvidence: number | null;
  /** Retrospective escaped-defect count; null is unknown, never assumed zero. */
  readonly escapedDefects: number | null;
  /** Verified artifact-identity mismatches; null when no artifact admission evidence was supplied. */
  readonly artifactMismatches: number | null;
  /** Selector misses found by broad/control comparison; null when no comparison evidence was supplied. */
  readonly selectorMisses: number | null;
  readonly resolvedCurePacketIds?: readonly string[];
}

export interface DeliveryMetrics {
  readonly schemaVersion: 1;
  readonly metricsId: `sha256:${string}`;
  readonly planId: AffectedTestPlan['planId'];
  readonly headSha: string;
  readonly risk: AffectedTestPlan['risk']['level'];
  readonly confidence: AffectedTestPlan['confidence'];
  readonly selectionWidth: {
    readonly changedPaths: number;
    readonly packages: number;
    readonly nodeTests: number;
    readonly platforms: number;
  };
  readonly timings: DeliveryTimingInput;
  readonly cacheHitRate: number | null;
  readonly rerunRate: number;
  readonly flakeRate: number | null;
  readonly evidenceCompleteness: number | null;
  readonly costPerVerifiedPathMinutes: number;
  readonly curePackets: { readonly emitted: number; readonly resolved: number };
  readonly slos: {
    readonly zeroFalseGreen: DeliverySloResult;
    readonly evidenceComplete: DeliverySloResult;
    readonly feedbackBounded: DeliverySloResult;
    readonly flakesBounded: DeliverySloResult;
    readonly artifactIdentity: DeliverySloResult;
    readonly selectorWithinBudget: DeliverySloResult;
  };
  readonly verdict: 'within-slo' | 'outside-slo' | 'insufficient-evidence';
}

export type DeliverySloResult = 'pass' | 'fail' | 'unknown';

const nonNegative = (name: string, value: number): number => {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be finite and non-negative`);
  return value;
};

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(',')}}`;
}

/** Fold measurements without reading ambient clocks, CI state, or mutable files. */
export function buildDeliveryMetrics(input: DeliveryMetricsInput): DeliveryMetrics {
  const numeric = [
    ['queueMs', input.timings.queueMs],
    ['feedbackLatencyMs', input.timings.feedbackLatencyMs],
    ['buildMs', input.timings.buildMs],
    ['testMs', input.timings.testMs],
    ['totalComputeMs', input.timings.totalComputeMs],
    ['jobAttempts', input.jobAttempts],
    ['reruns', input.reruns],
  ] as const;
  for (const [name, value] of numeric) nonNegative(name, value);
  for (const [name, value] of [
    ['knownFlakyReruns', input.knownFlakyReruns],
    ['requiredEvidence', input.requiredEvidence],
    ['presentEvidence', input.presentEvidence],
    ['escapedDefects', input.escapedDefects],
    ['artifactMismatches', input.artifactMismatches],
    ['selectorMisses', input.selectorMisses],
  ] as const) {
    if (value !== null) nonNegative(name, value);
  }
  if ((input.requiredEvidence === null) !== (input.presentEvidence === null)) {
    throw new TypeError('required and present evidence must both be known or both be null');
  }
  if (
    input.requiredEvidence !== null &&
    input.presentEvidence !== null &&
    input.presentEvidence > input.requiredEvidence
  ) {
    throw new TypeError('present evidence exceeds required evidence');
  }

  const results = input.reports.flatMap((report) => report.results).filter((result) => result.verdict !== 'skipped');
  const cacheHitRate =
    results.length === 0 ? null : results.filter((result) => result.cacheHit).length / results.length;
  const emittedCurePackets = new Set(
    input.reports.flatMap((report) => report.curePackets.map((packet) => packet.packetId)),
  );
  const resolved = new Set(input.resolvedCurePacketIds ?? []);
  for (const packet of resolved) {
    if (!emittedCurePackets.has(packet)) throw new TypeError(`resolved CurePacket was never emitted: ${packet}`);
  }
  const evidenceCompleteness =
    input.requiredEvidence === null || input.presentEvidence === null
      ? null
      : input.requiredEvidence === 0
        ? 0
        : input.presentEvidence / input.requiredEvidence;
  const rerunRate = input.jobAttempts === 0 ? 0 : input.reruns / input.jobAttempts;
  const flakeRate =
    input.knownFlakyReruns === null || input.jobAttempts === 0 ? null : input.knownFlakyReruns / input.jobAttempts;
  const assessed = (condition: boolean): DeliverySloResult => (condition ? 'pass' : 'fail');
  const slos = {
    zeroFalseGreen:
      input.escapedDefects === null
        ? ('unknown' as const)
        : assessed(input.escapedDefects <= DELIVERY_SLOS.falseGreenMax),
    evidenceComplete:
      evidenceCompleteness === null
        ? ('unknown' as const)
        : assessed(evidenceCompleteness >= DELIVERY_SLOS.requiredEvidenceCompletenessMin),
    feedbackBounded: assessed(input.timings.feedbackLatencyMs <= DELIVERY_SLOS.feedbackLatencyMsMax),
    flakesBounded: flakeRate === null ? ('unknown' as const) : assessed(flakeRate <= DELIVERY_SLOS.flakeRateMax),
    artifactIdentity:
      input.artifactMismatches === null
        ? ('unknown' as const)
        : assessed(input.artifactMismatches <= DELIVERY_SLOS.artifactMismatchMax),
    selectorWithinBudget:
      input.selectorMisses === null
        ? ('unknown' as const)
        : assessed(input.selectorMisses <= DELIVERY_SLOS.selectorMissMax),
  };
  const sloResults = Object.values(slos);
  const verdict = sloResults.includes('fail')
    ? ('outside-slo' as const)
    : sloResults.includes('unknown')
      ? ('insufficient-evidence' as const)
      : ('within-slo' as const);
  const unsigned = {
    schemaVersion: 1 as const,
    planId: input.plan.planId,
    headSha: input.plan.headSha,
    risk: input.plan.risk.level,
    confidence: input.plan.confidence,
    selectionWidth: {
      changedPaths: input.plan.changedPaths.length,
      packages: input.plan.affectedPackages.length,
      nodeTests: input.plan.estimatedCost.selectedNodeTests,
      platforms: input.plan.platforms.length,
    },
    timings: input.timings,
    cacheHitRate,
    rerunRate,
    flakeRate,
    evidenceCompleteness,
    costPerVerifiedPathMinutes: input.timings.totalComputeMs / 60_000 / Math.max(1, input.plan.changedPaths.length),
    curePackets: { emitted: emittedCurePackets.size, resolved: resolved.size },
    slos,
    verdict,
  };
  return {
    ...unsigned,
    metricsId: `sha256:${createHash('sha256').update(stable(unsigned)).digest('hex')}`,
  };
}

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
  /** Planned flake-campaign attempts underlying knownFlakyReruns; null with absent flake evidence. */
  readonly flakeAttempts: number | null;
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
  /** Addressed flake campaign admitted by the host; null when no campaign record exists. */
  readonly flakeEvidenceId: `sha256:${string}` | null;
  readonly resolvedCurePacketIds?: readonly string[];
}

export interface DeliveryMetrics {
  readonly schemaVersion: 2;
  readonly metricsId: `sha256:${string}`;
  readonly planId: AffectedTestPlan['planId'];
  readonly headSha: string;
  readonly risk: AffectedTestPlan['risk']['level'];
  readonly confidence: AffectedTestPlan['confidence'];
  readonly evidenceSources: {
    readonly selectorCalibrationId: AffectedTestPlan['selectorCalibrationId'];
    readonly flakeEvidenceId: `sha256:${string}` | null;
  };
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

function exactRecord(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify([...keys].sort())) {
    throw new TypeError(`${label} keys are invalid`);
  }
  return record;
}

function finiteNonNegative(value: unknown, label: string, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new TypeError(`${label} must be a finite non-negative${integer ? ' integer' : ''}`);
  }
  return value;
}

function nullableRate(value: unknown, label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${label} must be null or a finite rate from 0 to 1`);
  }
  return value;
}

function sha256OrNull(value: unknown, label: string): `sha256:${string}` | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError(`${label} must be null or a SHA-256 integrity digest`);
  }
  return value as `sha256:${string}`;
}

const DELIVERY_METRICS_KEYS = [
  'schemaVersion',
  'metricsId',
  'planId',
  'headSha',
  'risk',
  'confidence',
  'evidenceSources',
  'selectionWidth',
  'timings',
  'cacheHitRate',
  'rerunRate',
  'flakeRate',
  'evidenceCompleteness',
  'costPerVerifiedPathMinutes',
  'curePackets',
  'slos',
  'verdict',
] as const;

/** Parse the complete addressed metrics record. Unknown, missing, and malformed evidence fail closed. */
export function parseDeliveryMetrics(value: unknown): DeliveryMetrics {
  const record = exactRecord(value, DELIVERY_METRICS_KEYS, 'delivery metrics');
  if (record['schemaVersion'] !== 2) throw new TypeError('delivery metrics schemaVersion must be 2');
  const metricsId = sha256OrNull(record['metricsId'], 'delivery metrics metricsId');
  if (metricsId === null) throw new TypeError('delivery metrics metricsId is required');
  const planId = sha256OrNull(record['planId'], 'delivery metrics planId');
  if (planId === null) throw new TypeError('delivery metrics planId is required');
  if (typeof record['headSha'] !== 'string' || !/^[0-9a-f]{40}$/u.test(record['headSha'])) {
    throw new TypeError('delivery metrics headSha is invalid');
  }
  if (!['low', 'moderate', 'high', 'critical'].includes(String(record['risk']))) {
    throw new TypeError('delivery metrics risk is invalid');
  }
  if (record['confidence'] !== 'high' && record['confidence'] !== 'low') {
    throw new TypeError('delivery metrics confidence is invalid');
  }

  const evidenceSources = exactRecord(
    record['evidenceSources'],
    ['selectorCalibrationId', 'flakeEvidenceId'],
    'delivery metrics evidenceSources',
  );
  const selectorCalibrationId = sha256OrNull(
    evidenceSources['selectorCalibrationId'],
    'delivery metrics selectorCalibrationId',
  );
  const flakeEvidenceId = sha256OrNull(evidenceSources['flakeEvidenceId'], 'delivery metrics flakeEvidenceId');

  const selectionWidth = exactRecord(
    record['selectionWidth'],
    ['changedPaths', 'packages', 'nodeTests', 'platforms'],
    'delivery metrics selectionWidth',
  );
  const parsedSelectionWidth = {
    changedPaths: finiteNonNegative(selectionWidth['changedPaths'], 'delivery metrics changedPaths', true),
    packages: finiteNonNegative(selectionWidth['packages'], 'delivery metrics packages', true),
    nodeTests: finiteNonNegative(selectionWidth['nodeTests'], 'delivery metrics nodeTests', true),
    platforms: finiteNonNegative(selectionWidth['platforms'], 'delivery metrics platforms', true),
  };

  const timings = exactRecord(
    record['timings'],
    ['queueMs', 'feedbackLatencyMs', 'buildMs', 'testMs', 'totalComputeMs'],
    'delivery metrics timings',
  );
  const parsedTimings: DeliveryTimingInput = {
    queueMs: finiteNonNegative(timings['queueMs'], 'delivery metrics queueMs'),
    feedbackLatencyMs: finiteNonNegative(timings['feedbackLatencyMs'], 'delivery metrics feedbackLatencyMs'),
    buildMs: finiteNonNegative(timings['buildMs'], 'delivery metrics buildMs'),
    testMs: finiteNonNegative(timings['testMs'], 'delivery metrics testMs'),
    totalComputeMs: finiteNonNegative(timings['totalComputeMs'], 'delivery metrics totalComputeMs'),
  };

  const curePackets = exactRecord(record['curePackets'], ['emitted', 'resolved'], 'delivery metrics curePackets');
  const parsedCurePackets = {
    emitted: finiteNonNegative(curePackets['emitted'], 'delivery metrics emitted cure packets', true),
    resolved: finiteNonNegative(curePackets['resolved'], 'delivery metrics resolved cure packets', true),
  };
  if (parsedCurePackets.resolved > parsedCurePackets.emitted) {
    throw new TypeError('delivery metrics resolved cure packets exceed emitted packets');
  }

  const slos = exactRecord(
    record['slos'],
    [
      'zeroFalseGreen',
      'evidenceComplete',
      'feedbackBounded',
      'flakesBounded',
      'artifactIdentity',
      'selectorWithinBudget',
    ],
    'delivery metrics slos',
  );
  const slo = (key: keyof DeliveryMetrics['slos']): DeliverySloResult => {
    const result = slos[key];
    if (result !== 'pass' && result !== 'fail' && result !== 'unknown') {
      throw new TypeError(`delivery metrics SLO ${key} is invalid`);
    }
    return result;
  };
  const parsedSlos = {
    zeroFalseGreen: slo('zeroFalseGreen'),
    evidenceComplete: slo('evidenceComplete'),
    feedbackBounded: slo('feedbackBounded'),
    flakesBounded: slo('flakesBounded'),
    artifactIdentity: slo('artifactIdentity'),
    selectorWithinBudget: slo('selectorWithinBudget'),
  };
  const sloResults = Object.values(parsedSlos);
  const expectedVerdict = sloResults.includes('fail')
    ? 'outside-slo'
    : sloResults.includes('unknown')
      ? 'insufficient-evidence'
      : 'within-slo';
  if (record['verdict'] !== expectedVerdict) throw new TypeError('delivery metrics verdict does not match SLOs');

  const parsed: DeliveryMetrics = {
    schemaVersion: 2,
    metricsId,
    planId: planId as DeliveryMetrics['planId'],
    headSha: record['headSha'],
    risk: record['risk'] as DeliveryMetrics['risk'],
    confidence: record['confidence'],
    evidenceSources: { selectorCalibrationId, flakeEvidenceId },
    selectionWidth: parsedSelectionWidth,
    timings: parsedTimings,
    cacheHitRate: nullableRate(record['cacheHitRate'], 'delivery metrics cacheHitRate'),
    rerunRate: nullableRate(record['rerunRate'], 'delivery metrics rerunRate') ?? 0,
    flakeRate: nullableRate(record['flakeRate'], 'delivery metrics flakeRate'),
    evidenceCompleteness: nullableRate(record['evidenceCompleteness'], 'delivery metrics evidenceCompleteness'),
    costPerVerifiedPathMinutes: finiteNonNegative(
      record['costPerVerifiedPathMinutes'],
      'delivery metrics costPerVerifiedPathMinutes',
    ),
    curePackets: parsedCurePackets,
    slos: parsedSlos,
    verdict: expectedVerdict,
  };
  const { metricsId: _metricsId, ...unsigned } = parsed;
  const expectedId = `sha256:${createHash('sha256').update(stable(unsigned)).digest('hex')}`;
  if (metricsId !== expectedId) throw new TypeError('delivery metrics semantic identity is invalid');
  return Object.freeze(parsed);
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
    ['flakeAttempts', input.flakeAttempts],
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
    (input.knownFlakyReruns === null) !== (input.flakeAttempts === null) ||
    (input.knownFlakyReruns === null) !== (input.flakeEvidenceId === null)
  ) {
    throw new TypeError('flake count, attempt count, and evidence identity must be supplied together');
  }
  if (input.knownFlakyReruns !== null && input.flakeAttempts !== null && input.knownFlakyReruns > input.flakeAttempts) {
    throw new TypeError('known flaky reruns exceed observed flake attempts');
  }
  if (input.flakeEvidenceId !== null && !/^sha256:[0-9a-f]{64}$/u.test(input.flakeEvidenceId)) {
    throw new TypeError('flakeEvidenceId must be a SHA-256 integrity digest');
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
    input.knownFlakyReruns === null || input.flakeAttempts === null
      ? null
      : input.flakeAttempts === 0
        ? 0
        : input.knownFlakyReruns / input.flakeAttempts;
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
    schemaVersion: 2 as const,
    planId: input.plan.planId,
    headSha: input.plan.headSha,
    risk: input.plan.risk.level,
    confidence: input.plan.confidence,
    evidenceSources: {
      selectorCalibrationId: input.plan.selectorCalibrationId,
      flakeEvidenceId: input.flakeEvidenceId,
    },
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

/**
 * Stage only artifact identity for the final standalone admission fold. The
 * standalone verifier remains the authority that proves every referenced raw
 * byte before an admission receipt can be minted.
 */
export function admitVerifiedArtifactIdentity(metrics: DeliveryMetrics): DeliveryMetrics {
  const parsed = parseDeliveryMetrics(metrics);
  const { metricsId: _metricsId, ...currentUnsigned } = parsed;
  if (parsed.slos.artifactIdentity !== 'unknown') {
    throw new TypeError('artifact identity must be unknown before standalone admission');
  }
  const slos = { ...parsed.slos, artifactIdentity: 'pass' as const };
  const results = Object.values(slos);
  const verdict = results.includes('fail')
    ? ('outside-slo' as const)
    : results.includes('unknown')
      ? ('insufficient-evidence' as const)
      : ('within-slo' as const);
  const unsigned = { ...currentUnsigned, slos, verdict };
  return {
    ...unsigned,
    metricsId: `sha256:${createHash('sha256').update(stable(unsigned)).digest('hex')}`,
  };
}

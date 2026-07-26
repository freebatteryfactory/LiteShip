/** Deterministic delivery metrics and SLO fold over addressed plan/check evidence. @module */

import { createHash } from 'node:crypto';
import type { CheckReport } from '../../packages/command/src/checks/plan.js';
import {
  admitBenchmarkEvidence,
  parseBenchmarkEvidenceArtifact,
  type BenchmarkEvidenceArtifact,
  type BenchmarkEvidenceAuthority,
} from '../bench/contracts.js';
import type { AffectedTestPlan } from './affected-test-plan.js';
import { parseChangeIntent, type ChangeIntent } from './change-intent.js';

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
  /** Admitted intent bound to this head; absent means intent-scoped health is unknown. */
  readonly changeIntent?: ChangeIntent | null;
  /** Optional timestamps from the current plan/head evidence batch. */
  readonly timeline?: DeliveryHealthTimelineInput | null;
  /** Existing scientific benchmark artifact plus its live admission authority. */
  readonly benchmarkEvidence?: DeliveryBenchmarkEvidenceInput | null;
}

export interface DeliveryHealthTimelineInput {
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
}

export interface DeliveryBenchmarkEvidenceInput {
  readonly artifact: BenchmarkEvidenceArtifact;
  readonly authority: BenchmarkEvidenceAuthority;
}

type KnownDuration =
  | { readonly classification: 'known'; readonly milliseconds: number }
  | { readonly classification: 'unknown'; readonly milliseconds: null };

export interface DeliveryHealth {
  readonly scope: {
    readonly kind: 'library';
    readonly packages: readonly string[];
  };
  readonly intentId: ChangeIntent['intentId'] | null;
  readonly feedback: {
    readonly classification: 'known';
    readonly milliseconds: number;
    readonly slo: 'pass' | 'fail';
  };
  readonly commitToEvidence: KnownDuration;
  readonly failureRecovery: {
    readonly classification: 'no-observed-failure' | 'recovered' | 'failed' | 'unknown';
    readonly milliseconds: number | null;
  };
  readonly reviewBatch: {
    readonly classification: 'single-batch' | 'rebatch' | 'unknown';
    readonly reviewMs: number | null;
    readonly batchMs: number | null;
  };
  readonly quickCureCache: {
    readonly classification: 'executed' | 'cache-served' | 'mixed-cache' | 'repair-open' | 'repair-closed' | 'unknown';
    readonly executed: number;
    readonly cacheHits: number;
    readonly curePacketsEmitted: number;
    readonly curePacketsResolved: number;
  };
  readonly compute: {
    readonly classification: 'measured';
    readonly totalMinutes: number;
    readonly perChangedPathMinutes: number;
  };
  readonly benchmark: {
    readonly classification: 'pass' | 'fail' | 'unknown';
    readonly artifactId: string | null;
    readonly reasons: readonly string[];
  };
}

export interface DeliveryMetrics {
  readonly schemaVersion: 3;
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
  readonly health: DeliveryHealth;
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

function instant(value: string | null, label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new TypeError(`${label} must be an ISO timestamp or null`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new TypeError(`${label} must be a canonical ISO timestamp or null`);
  }
  return parsed;
}

function durationBetween(start: number | null, end: number | null, label: string): number | null {
  if (start === null || end === null) return null;
  if (end < start) throw new TypeError(`${label} ends before it starts`);
  return end - start;
}

function buildDeliveryHealth(
  input: DeliveryMetricsInput,
  resolvedCurePackets: ReadonlySet<string>,
): DeliveryHealth {
  const intent = input.changeIntent === undefined || input.changeIntent === null ? null : parseChangeIntent(input.changeIntent);
  if (intent !== null && intent.sourceSha.value !== input.plan.headSha) {
    throw new TypeError('delivery health change intent belongs to a foreign head');
  }

  const timeline = input.timeline ?? null;
  if (timeline !== null && timeline.sourceSha !== input.plan.headSha) {
    throw new TypeError('delivery health timeline belongs to a foreign head');
  }
  if (timeline !== null && timeline.planId !== input.plan.planId) {
    throw new TypeError('delivery health timeline is stale for the affected plan');
  }

  const committedAt = timeline === null ? null : instant(timeline.committedAt, 'delivery health committedAt');
  const firstEvidenceAt =
    timeline === null ? null : instant(timeline.firstEvidenceAt, 'delivery health firstEvidenceAt');
  const lastEvidenceAt = timeline === null ? null : instant(timeline.lastEvidenceAt, 'delivery health lastEvidenceAt');
  const failureAt = timeline === null ? null : instant(timeline.failureAt, 'delivery health failureAt');
  const recoveredAt = timeline === null ? null : instant(timeline.recoveredAt, 'delivery health recoveredAt');
  const reviewStartedAt =
    timeline === null ? null : instant(timeline.reviewStartedAt, 'delivery health reviewStartedAt');
  const reviewCompletedAt =
    timeline === null ? null : instant(timeline.reviewCompletedAt, 'delivery health reviewCompletedAt');
  const batchStartedAt = timeline === null ? null : instant(timeline.batchStartedAt, 'delivery health batchStartedAt');
  const batchCompletedAt =
    timeline === null ? null : instant(timeline.batchCompletedAt, 'delivery health batchCompletedAt');

  if (firstEvidenceAt !== null && lastEvidenceAt !== null && lastEvidenceAt < firstEvidenceAt) {
    throw new TypeError('delivery health evidence completion precedes first evidence');
  }
  if (recoveredAt !== null && failureAt === null) {
    throw new TypeError('delivery health recovery has no preceding failure');
  }
  const commitToEvidenceMs = durationBetween(committedAt, lastEvidenceAt, 'delivery health commit-to-evidence');
  const recoveryMs = durationBetween(failureAt, recoveredAt, 'delivery health failure recovery');
  const reviewMs = durationBetween(reviewStartedAt, reviewCompletedAt, 'delivery health review');
  const batchMs = durationBetween(batchStartedAt, batchCompletedAt, 'delivery health batch');

  const quickReports = input.reports.filter((report) => report.profile === 'quick');
  const quickResults = quickReports.flatMap((report) => report.results).filter((result) => result.verdict !== 'skipped');
  const quickPacketIds = new Set<string>(
    quickReports.flatMap((report) => report.curePackets.map((packet) => packet.packetId)),
  );
  const resolvedQuickPackets = [...resolvedCurePackets].filter((packet) => quickPacketIds.has(packet)).length;
  const quickCacheHits = quickResults.filter((result) => result.cacheHit).length;
  const quickClassification: DeliveryHealth['quickCureCache']['classification'] =
    quickResults.length === 0
      ? 'unknown'
      : quickPacketIds.size > resolvedQuickPackets
        ? 'repair-open'
        : quickPacketIds.size > 0
          ? 'repair-closed'
          : quickCacheHits === quickResults.length
            ? 'cache-served'
            : quickCacheHits > 0
              ? 'mixed-cache'
              : 'executed';

  let benchmark: DeliveryHealth['benchmark'] = { classification: 'unknown', artifactId: null, reasons: [] };
  if (input.benchmarkEvidence !== undefined && input.benchmarkEvidence !== null) {
    if (input.benchmarkEvidence.authority.sourceSha !== input.plan.headSha) {
      throw new TypeError('delivery health benchmark authority belongs to a foreign head');
    }
    const artifact = parseBenchmarkEvidenceArtifact(input.benchmarkEvidence.artifact);
    const affected = new Set(input.plan.affectedPackages);
    const records = artifact.evidence.filter((evidence) => affected.has(evidence.sut.owner));
    if (records.length === 0) {
      benchmark = {
        classification: 'unknown',
        artifactId: artifact.artifactId,
        reasons: ['no-affected-package-benchmark-evidence'],
      };
    } else {
      const admissions = records.map((evidence) => admitBenchmarkEvidence(evidence, input.benchmarkEvidence!.authority));
      const reasons = [...new Set(admissions.flatMap((admission) => admission.reasons))].sort();
      benchmark = {
        classification: admissions.some((admission) => admission.disposition === 'fail')
          ? 'fail'
          : admissions.some((admission) => admission.disposition === 'unknown')
            ? 'unknown'
            : 'pass',
        artifactId: artifact.artifactId,
        reasons,
      };
    }
  }

  const anyFailedReport = input.reports.some((report) =>
    report.results.some((result) => result.verdict === 'fail'),
  );
  const failureRecovery: DeliveryHealth['failureRecovery'] =
    failureAt === null
      ? input.reports.length === 0
        ? { classification: 'unknown', milliseconds: null }
        : anyFailedReport
          ? { classification: 'failed', milliseconds: null }
          : { classification: 'no-observed-failure', milliseconds: null }
      : recoveredAt === null
        ? { classification: 'failed', milliseconds: null }
        : { classification: 'recovered', milliseconds: recoveryMs };

  return Object.freeze({
    scope: Object.freeze({ kind: 'library' as const, packages: Object.freeze([...input.plan.affectedPackages].sort()) }),
    intentId: intent?.intentId ?? null,
    feedback: Object.freeze({
      classification: 'known' as const,
      milliseconds: input.timings.feedbackLatencyMs,
      slo: input.timings.feedbackLatencyMs <= DELIVERY_SLOS.feedbackLatencyMsMax ? ('pass' as const) : ('fail' as const),
    }),
    commitToEvidence:
      commitToEvidenceMs === null
        ? Object.freeze({ classification: 'unknown' as const, milliseconds: null })
        : Object.freeze({ classification: 'known' as const, milliseconds: commitToEvidenceMs }),
    failureRecovery: Object.freeze(failureRecovery),
    reviewBatch: Object.freeze({
      classification: batchMs === null ? ('unknown' as const) : input.reruns > 0 ? ('rebatch' as const) : ('single-batch' as const),
      reviewMs,
      batchMs,
    }),
    quickCureCache: Object.freeze({
      classification: quickClassification,
      executed: quickResults.length,
      cacheHits: quickCacheHits,
      curePacketsEmitted: quickPacketIds.size,
      curePacketsResolved: resolvedQuickPackets,
    }),
    compute: Object.freeze({
      classification: 'measured' as const,
      totalMinutes: input.timings.totalComputeMs / 60_000,
      perChangedPathMinutes: input.timings.totalComputeMs / 60_000 / Math.max(1, input.plan.changedPaths.length),
    }),
    benchmark: Object.freeze(benchmark),
  });
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
  'health',
  'curePackets',
  'slos',
  'verdict',
] as const;

/** Parse the complete addressed metrics record. Unknown, missing, and malformed evidence fail closed. */
export function parseDeliveryMetrics(value: unknown): DeliveryMetrics {
  const record = exactRecord(value, DELIVERY_METRICS_KEYS, 'delivery metrics');
  if (record['schemaVersion'] !== 3) throw new TypeError('delivery metrics schemaVersion must be 3');
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

  const health = exactRecord(
    record['health'],
    ['scope', 'intentId', 'feedback', 'commitToEvidence', 'failureRecovery', 'reviewBatch', 'quickCureCache', 'compute', 'benchmark'],
    'delivery metrics health',
  );
  const scope = exactRecord(health['scope'], ['kind', 'packages'], 'delivery metrics health scope');
  if (scope['kind'] !== 'library') throw new TypeError('delivery metrics health scope must be library');
  if (!Array.isArray(scope['packages']) || scope['packages'].some((value) => typeof value !== 'string')) {
    throw new TypeError('delivery metrics health packages must be strings');
  }
  const healthPackages = scope['packages'] as string[];
  if (
    new Set(healthPackages).size !== healthPackages.length ||
    JSON.stringify(healthPackages) !== JSON.stringify([...healthPackages].sort())
  ) {
    throw new TypeError('delivery metrics health packages must be sorted and unique');
  }
  if (healthPackages.length !== parsedSelectionWidth.packages) {
    throw new TypeError('delivery metrics health package scope contradicts selection width');
  }
  const intentId = sha256OrNull(health['intentId'], 'delivery metrics health intentId');
  const duration = (candidate: unknown, label: string): KnownDuration => {
    const row = exactRecord(candidate, ['classification', 'milliseconds'], label);
    if (row['classification'] === 'unknown') {
      if (row['milliseconds'] !== null) throw new TypeError(`${label} unknown duration must be null`);
      return { classification: 'unknown', milliseconds: null };
    }
    if (row['classification'] !== 'known') throw new TypeError(`${label} classification is invalid`);
    return { classification: 'known', milliseconds: finiteNonNegative(row['milliseconds'], `${label} milliseconds`) };
  };
  const feedbackRow = exactRecord(
    health['feedback'],
    ['classification', 'milliseconds', 'slo'],
    'delivery metrics health feedback',
  );
  if (feedbackRow['classification'] !== 'known') throw new TypeError('delivery metrics health feedback must be known');
  const feedbackMs = finiteNonNegative(feedbackRow['milliseconds'], 'delivery metrics health feedback milliseconds');
  const expectedFeedbackSlo = feedbackMs <= DELIVERY_SLOS.feedbackLatencyMsMax ? 'pass' : 'fail';
  if (feedbackRow['slo'] !== expectedFeedbackSlo || feedbackMs !== parsedTimings.feedbackLatencyMs) {
    throw new TypeError('delivery metrics health feedback contradicts measured timings');
  }
  const commitToEvidence = duration(health['commitToEvidence'], 'delivery metrics health commitToEvidence');

  const failureRecovery = exactRecord(
    health['failureRecovery'],
    ['classification', 'milliseconds'],
    'delivery metrics health failureRecovery',
  );
  if (!['no-observed-failure', 'recovered', 'failed', 'unknown'].includes(String(failureRecovery['classification']))) {
    throw new TypeError('delivery metrics health failureRecovery classification is invalid');
  }
  const recoveryMs =
    failureRecovery['milliseconds'] === null
      ? null
      : finiteNonNegative(failureRecovery['milliseconds'], 'delivery metrics health failureRecovery milliseconds');
  if ((failureRecovery['classification'] === 'recovered') !== (recoveryMs !== null)) {
    throw new TypeError('delivery metrics health recovery duration contradicts classification');
  }

  const reviewBatch = exactRecord(
    health['reviewBatch'],
    ['classification', 'reviewMs', 'batchMs'],
    'delivery metrics health reviewBatch',
  );
  if (!['single-batch', 'rebatch', 'unknown'].includes(String(reviewBatch['classification']))) {
    throw new TypeError('delivery metrics health reviewBatch classification is invalid');
  }
  const reviewMs =
    reviewBatch['reviewMs'] === null
      ? null
      : finiteNonNegative(reviewBatch['reviewMs'], 'delivery metrics health reviewMs');
  const batchMs =
    reviewBatch['batchMs'] === null
      ? null
      : finiteNonNegative(reviewBatch['batchMs'], 'delivery metrics health batchMs');
  if ((reviewBatch['classification'] === 'unknown') !== (batchMs === null)) {
    throw new TypeError('delivery metrics health batch duration contradicts classification');
  }

  const quickCureCache = exactRecord(
    health['quickCureCache'],
    ['classification', 'executed', 'cacheHits', 'curePacketsEmitted', 'curePacketsResolved'],
    'delivery metrics health quickCureCache',
  );
  if (!['executed', 'cache-served', 'mixed-cache', 'repair-open', 'repair-closed', 'unknown'].includes(String(quickCureCache['classification']))) {
    throw new TypeError('delivery metrics health quickCureCache classification is invalid');
  }
  const quickExecuted = finiteNonNegative(quickCureCache['executed'], 'delivery metrics health quick executed', true);
  const quickCacheHits = finiteNonNegative(quickCureCache['cacheHits'], 'delivery metrics health quick cache hits', true);
  const quickEmitted = finiteNonNegative(
    quickCureCache['curePacketsEmitted'],
    'delivery metrics health quick cure packets emitted',
    true,
  );
  const quickResolved = finiteNonNegative(
    quickCureCache['curePacketsResolved'],
    'delivery metrics health quick cure packets resolved',
    true,
  );
  if (quickCacheHits > quickExecuted || quickResolved > quickEmitted) {
    throw new TypeError('delivery metrics health quick/cache/cure counts are inconsistent');
  }
  if ((quickCureCache['classification'] === 'unknown') !== (quickExecuted === 0)) {
    throw new TypeError('delivery metrics health quick classification contradicts executions');
  }
  const quickClassification = quickCureCache['classification'];
  if (
    (quickClassification === 'cache-served' && quickCacheHits !== quickExecuted) ||
    (quickClassification === 'mixed-cache' && (quickCacheHits === 0 || quickCacheHits === quickExecuted)) ||
    (quickClassification === 'executed' && (quickCacheHits !== 0 || quickEmitted !== 0)) ||
    (quickClassification === 'repair-open' && quickEmitted <= quickResolved) ||
    (quickClassification === 'repair-closed' && (quickEmitted === 0 || quickEmitted !== quickResolved))
  ) {
    throw new TypeError('delivery metrics health quick classification contradicts cache or cure evidence');
  }

  const compute = exactRecord(
    health['compute'],
    ['classification', 'totalMinutes', 'perChangedPathMinutes'],
    'delivery metrics health compute',
  );
  if (compute['classification'] !== 'measured') throw new TypeError('delivery metrics health compute must be measured');
  const computeTotal = finiteNonNegative(compute['totalMinutes'], 'delivery metrics health compute totalMinutes');
  const computePerPath = finiteNonNegative(
    compute['perChangedPathMinutes'],
    'delivery metrics health compute perChangedPathMinutes',
  );
  if (computeTotal !== parsedTimings.totalComputeMs / 60_000) {
    throw new TypeError('delivery metrics health compute contradicts measured timings');
  }
  if (computePerPath !== computeTotal / Math.max(1, parsedSelectionWidth.changedPaths)) {
    throw new TypeError('delivery metrics health per-path compute contradicts selection width');
  }

  const benchmark = exactRecord(
    health['benchmark'],
    ['classification', 'artifactId', 'reasons'],
    'delivery metrics health benchmark',
  );
  if (!['pass', 'fail', 'unknown'].includes(String(benchmark['classification']))) {
    throw new TypeError('delivery metrics health benchmark classification is invalid');
  }
  const benchmarkArtifactId = sha256OrNull(benchmark['artifactId'], 'delivery metrics health benchmark artifactId');
  if (!Array.isArray(benchmark['reasons']) || benchmark['reasons'].some((reason) => typeof reason !== 'string')) {
    throw new TypeError('delivery metrics health benchmark reasons must be strings');
  }
  const benchmarkReasons = benchmark['reasons'] as string[];
  if (new Set(benchmarkReasons).size !== benchmarkReasons.length || JSON.stringify(benchmarkReasons) !== JSON.stringify([...benchmarkReasons].sort())) {
    throw new TypeError('delivery metrics health benchmark reasons must be sorted and unique');
  }
  if (
    (benchmarkArtifactId === null &&
      (benchmark['classification'] !== 'unknown' || benchmarkReasons.length !== 0)) ||
    (benchmark['classification'] === 'pass' &&
      (benchmarkArtifactId === null || benchmarkReasons.length !== 0)) ||
    (benchmark['classification'] !== 'pass' && benchmarkArtifactId !== null && benchmarkReasons.length === 0)
  ) {
    throw new TypeError('delivery metrics health benchmark classification contradicts admitted evidence');
  }

  const parsedHealth: DeliveryHealth = {
    scope: { kind: 'library', packages: healthPackages },
    intentId,
    feedback: { classification: 'known', milliseconds: feedbackMs, slo: expectedFeedbackSlo },
    commitToEvidence,
    failureRecovery: {
      classification: failureRecovery['classification'] as DeliveryHealth['failureRecovery']['classification'],
      milliseconds: recoveryMs,
    },
    reviewBatch: {
      classification: reviewBatch['classification'] as DeliveryHealth['reviewBatch']['classification'],
      reviewMs,
      batchMs,
    },
    quickCureCache: {
      classification: quickCureCache['classification'] as DeliveryHealth['quickCureCache']['classification'],
      executed: quickExecuted,
      cacheHits: quickCacheHits,
      curePacketsEmitted: quickEmitted,
      curePacketsResolved: quickResolved,
    },
    compute: { classification: 'measured', totalMinutes: computeTotal, perChangedPathMinutes: computePerPath },
    benchmark: {
      classification: benchmark['classification'] as DeliveryHealth['benchmark']['classification'],
      artifactId: benchmarkArtifactId,
      reasons: benchmarkReasons,
    },
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
    schemaVersion: 3,
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
    health: parsedHealth,
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
  const emittedCurePackets = new Set<string>(
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
    schemaVersion: 3 as const,
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
    health: buildDeliveryHealth(input, resolved),
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

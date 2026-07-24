/** Addressed qualification evidence for the affected-test selector. @module */

import { createHash } from 'node:crypto';
import type { AssuranceInventory } from './assurance-inventory.js';
import { planAffectedTests, type AffectedRiskLevel, type AffectedTestPlan } from './affected-test-plan.js';
import type { PackageCatalogRecord } from '../package-catalog.js';

export interface AffectedImpactCase {
  readonly id: string;
  readonly paths: readonly string[];
  readonly mode: 'focused' | 'full';
  readonly minimumRisk: AffectedRiskLevel;
  readonly browserRequired: boolean;
  readonly requiredOwners: readonly string[];
  readonly requiredChecks: readonly string[];
}

export interface AffectedSelectorCalibration {
  readonly schemaVersion: 1;
  readonly calibrationId: `sha256:${string}`;
  readonly selectorFingerprint: `sha256:${string}`;
  readonly catalogFingerprint: `sha256:${string}`;
  readonly inventoryFingerprint: `sha256:${string}`;
  readonly corpusFingerprint: `sha256:${string}`;
  readonly observations: readonly {
    readonly id: string;
    readonly planId: `sha256:${string}`;
    readonly misses: readonly string[];
  }[];
  readonly selectorMisses: number;
  readonly status: 'pass' | 'fail';
}

export interface AffectedSelectorCalibrationInputs {
  readonly selectorFingerprint: `sha256:${string}`;
  readonly catalog: readonly PackageCatalogRecord[];
  readonly inventory: AssuranceInventory;
  readonly corpus: readonly AffectedImpactCase[];
}

type UnsignedCalibration = Omit<AffectedSelectorCalibration, 'calibrationId'>;

const RISK_RANK: Readonly<Record<AffectedRiskLevel, number>> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function digest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stableSerialize(value)).digest('hex')}`;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function normalizeCorpus(corpus: readonly AffectedImpactCase[]): readonly AffectedImpactCase[] {
  const normalized = corpus
    .map((entry) => {
      if (entry.id.length === 0) throw new TypeError('affected impact case id must not be empty');
      return {
        ...entry,
        paths: sortedUnique(entry.paths),
        requiredOwners: sortedUnique(entry.requiredOwners),
        requiredChecks: sortedUnique(entry.requiredChecks),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(normalized.map((entry) => entry.id)).size !== normalized.length) {
    throw new TypeError('affected impact case ids must be unique');
  }
  return normalized;
}

function missesFor(entry: AffectedImpactCase, plan: AffectedTestPlan): readonly string[] {
  const misses: string[] = [];
  if (plan.mode !== entry.mode) misses.push(`mode:${entry.mode}`);
  if (RISK_RANK[plan.risk.level] < RISK_RANK[entry.minimumRisk]) {
    misses.push(`risk:${entry.minimumRisk}`);
  }
  if (plan.browserRequired !== entry.browserRequired) {
    misses.push(`browser:${String(entry.browserRequired)}`);
  }
  for (const owner of entry.requiredOwners) {
    if (!plan.affectedPackages.includes(owner)) misses.push(`owner:${owner}`);
  }
  for (const check of entry.requiredChecks) {
    if (!plan.requiredChecks.includes(check)) misses.push(`check:${check}`);
  }
  return misses.sort();
}

/** Build one zero-tolerance calibration from independent impact expectations. */
export function buildAffectedSelectorCalibration(
  inputs: AffectedSelectorCalibrationInputs,
): AffectedSelectorCalibration {
  const corpus = normalizeCorpus(inputs.corpus);
  const observations = corpus.map((entry) => {
    const plan = planAffectedTests(entry.paths, inputs.catalog, inputs.inventory);
    return { id: entry.id, planId: plan.planId, misses: missesFor(entry, plan) };
  });
  const selectorMisses = observations.reduce((total, observation) => total + observation.misses.length, 0);
  const unsigned: UnsignedCalibration = {
    schemaVersion: 1,
    selectorFingerprint: inputs.selectorFingerprint,
    catalogFingerprint: digest(inputs.catalog),
    inventoryFingerprint: digest(inputs.inventory),
    corpusFingerprint: digest(corpus),
    observations,
    selectorMisses,
    status: selectorMisses === 0 ? 'pass' : 'fail',
  };
  return { ...unsigned, calibrationId: digest(unsigned) };
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    stableSerialize(Object.keys(value).sort()) === stableSerialize([...keys].sort())
  );
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value);
}

/** Strictly decode a calibration at a process or artifact boundary. */
export function parseAffectedSelectorCalibration(value: unknown): AffectedSelectorCalibration {
  if (
    !exactKeys(value, [
      'calibrationId',
      'catalogFingerprint',
      'corpusFingerprint',
      'inventoryFingerprint',
      'observations',
      'schemaVersion',
      'selectorFingerprint',
      'selectorMisses',
      'status',
    ])
  ) {
    throw new TypeError('affected selector calibration has an invalid envelope');
  }
  if (value['schemaVersion'] !== 1) throw new TypeError('affected selector calibration schemaVersion must be 1');
  for (const key of [
    'calibrationId',
    'catalogFingerprint',
    'corpusFingerprint',
    'inventoryFingerprint',
    'selectorFingerprint',
  ]) {
    if (!isDigest(value[key])) throw new TypeError(`affected selector calibration ${key} is invalid`);
  }
  if (!Number.isSafeInteger(value['selectorMisses']) || Number(value['selectorMisses']) < 0) {
    throw new TypeError('affected selector calibration miss count is invalid');
  }
  if (value['status'] !== 'pass' && value['status'] !== 'fail') {
    throw new TypeError('affected selector calibration status is invalid');
  }
  if (!Array.isArray(value['observations'])) {
    throw new TypeError('affected selector calibration observations are invalid');
  }
  let prior = '';
  let countedMisses = 0;
  for (const observation of value['observations']) {
    if (!exactKeys(observation, ['id', 'misses', 'planId'])) {
      throw new TypeError('affected selector calibration observation is invalid');
    }
    if (typeof observation['id'] !== 'string' || observation['id'].length === 0 || observation['id'] <= prior) {
      throw new TypeError('affected selector calibration observation ids must be sorted and unique');
    }
    if (!isDigest(observation['planId'])) {
      throw new TypeError('affected selector calibration observation plan id is invalid');
    }
    if (
      !Array.isArray(observation['misses']) ||
      observation['misses'].some((miss) => typeof miss !== 'string') ||
      observation['misses'].some((miss, index, misses) => index > 0 && misses[index - 1]! >= miss)
    ) {
      throw new TypeError('affected selector calibration observation misses are invalid');
    }
    prior = observation['id'];
    countedMisses += observation['misses'].length;
  }
  if (countedMisses !== value['selectorMisses']) {
    throw new TypeError('affected selector calibration miss count is stale');
  }
  if ((countedMisses === 0) !== (value['status'] === 'pass')) {
    throw new TypeError('affected selector calibration status contradicts its observations');
  }
  const { calibrationId, ...unsigned } = value;
  if (calibrationId !== digest(unsigned)) {
    throw new TypeError('affected selector calibration integrity digest does not match its bytes');
  }
  return value as unknown as AffectedSelectorCalibration;
}

/** Refuse a valid but stale/foreign calibration for the current selector inputs. */
export function assertAffectedSelectorCalibrationCurrent(
  calibration: AffectedSelectorCalibration,
  inputs: AffectedSelectorCalibrationInputs,
): void {
  const parsed = parseAffectedSelectorCalibration(calibration);
  if (parsed.selectorFingerprint !== inputs.selectorFingerprint) {
    throw new TypeError('affected selector calibration is stale for the selector source');
  }
  if (parsed.catalogFingerprint !== digest(inputs.catalog)) {
    throw new TypeError('affected selector calibration is stale for the package catalog');
  }
  if (parsed.inventoryFingerprint !== digest(inputs.inventory)) {
    throw new TypeError('affected selector calibration is stale for the assurance inventory');
  }
  if (parsed.corpusFingerprint !== digest(normalizeCorpus(inputs.corpus))) {
    throw new TypeError('affected selector calibration is stale for the impact corpus');
  }
  if (parsed.status !== 'pass' || parsed.selectorMisses !== 0) {
    throw new TypeError('affected selector calibration contains selector misses');
  }
}

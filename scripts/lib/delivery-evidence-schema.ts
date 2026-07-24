/** Pure wire schema for standalone delivery-evidence admission. @module */

import { createHash } from 'node:crypto';

export type DeliveryEvidenceEvent = 'pull_request' | 'push' | 'schedule' | 'workflow_dispatch' | 'workflow_call';
export type Sha256Digest = `sha256:${string}`;

export interface DeliveryEvidencePlanReference {
  readonly id: Sha256Digest;
  readonly path: '.liteship/affected-plan.json';
  readonly digest: Sha256Digest;
}

export interface DeliveryEvidenceGithubIdentity {
  readonly repository: string;
  readonly workflow: string;
  readonly runId: string;
  readonly runAttempt: string;
  readonly ref: string;
}

export interface ChangeIntentEvidenceReference {
  readonly id: Sha256Digest;
  readonly kind: 'change-intent';
  readonly path: 'reports/change-intent.json';
  readonly digest: Sha256Digest;
  readonly verifier: 'delivery-evidence/change-intent-v1';
}

export interface CiAuthorityEvidenceReference {
  readonly id: Sha256Digest;
  readonly kind: 'ci-authority';
  readonly path: 'reports/ci-authority.json';
  readonly digest: Sha256Digest;
  readonly verifier: 'delivery-evidence/ci-authority-v1';
}

export interface GovernedExceptionsEvidenceReference {
  readonly id: Sha256Digest;
  readonly kind: 'governed-exceptions';
  readonly path: 'reports/governed-exceptions.json';
  readonly digest: Sha256Digest;
  readonly verifier: 'delivery-evidence/governed-exceptions-v1';
}

export interface DeliveryCheckEvidenceReference {
  readonly id: string;
  readonly evidenceId: Sha256Digest;
  readonly checkId: string;
  readonly kind: 'check-report';
  readonly path: string;
  readonly digest: Sha256Digest;
  readonly producer: string;
  readonly command: string;
  readonly verifier: 'delivery-evidence/check-report-v1';
  readonly platforms: readonly string[];
}

export interface DeliveryMetricsEvidenceReference {
  readonly id: Sha256Digest;
  readonly kind: 'delivery-metrics';
  readonly path: 'reports/delivery-metrics.json';
  readonly digest: Sha256Digest;
  readonly verifier: 'delivery-evidence/metrics-v2';
}

export interface DeliveryEvidenceManifestUnsigned {
  readonly schemaVersion: 2;
  readonly event: DeliveryEvidenceEvent;
  readonly headSha: string;
  readonly plan: DeliveryEvidencePlanReference;
  readonly github: DeliveryEvidenceGithubIdentity;
  readonly intent: ChangeIntentEvidenceReference;
  readonly authority: CiAuthorityEvidenceReference;
  readonly governedExceptions: GovernedExceptionsEvidenceReference | null;
  readonly evidence: readonly DeliveryCheckEvidenceReference[];
  readonly metrics: DeliveryMetricsEvidenceReference;
  readonly verdict: 'accepted';
}

export interface DeliveryEvidenceManifest extends DeliveryEvidenceManifestUnsigned {
  readonly manifestId: Sha256Digest;
}

const MANIFEST_KEYS = [
  'schemaVersion',
  'manifestId',
  'event',
  'headSha',
  'plan',
  'github',
  'intent',
  'authority',
  'governedExceptions',
  'evidence',
  'metrics',
  'verdict',
] as const;
const PLAN_KEYS = ['id', 'path', 'digest'] as const;
const GITHUB_KEYS = ['repository', 'workflow', 'runId', 'runAttempt', 'ref'] as const;
const EVIDENCE_KEYS = [
  'id',
  'evidenceId',
  'checkId',
  'kind',
  'path',
  'digest',
  'producer',
  'command',
  'verifier',
  'platforms',
] as const;
const METRICS_KEYS = ['id', 'kind', 'path', 'digest', 'verifier'] as const;
const SUPPORTING_EVIDENCE_KEYS = ['id', 'kind', 'path', 'digest', 'verifier'] as const;
const EVENTS = new Set<DeliveryEvidenceEvent>([
  'pull_request',
  'push',
  'schedule',
  'workflow_dispatch',
  'workflow_call',
]);
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const CHECK_ID_PATTERN = /^check\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const EVIDENCE_ID_PATTERN = /^evidence\/check\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function fail(message: string): never {
  throw new TypeError(`invalid delivery evidence manifest: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${label} keys are invalid: ${actual.join(', ')}`);
}

function nonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    fail(`${label} must be a non-empty trimmed string`);
  }
}

function digest(value: unknown, label: string): asserts value is Sha256Digest {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) fail(`${label} must be a SHA-256 digest`);
}

function normalizedPath(value: unknown, label: string): asserts value is string {
  nonEmpty(value, label);
  if (
    value.includes('\\') ||
    value.startsWith('/') ||
    /^[A-Za-z]:\//u.test(value) ||
    value.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    fail(`${label} must be a normalized relative path`);
  }
}

function parseJson(raw: string | Uint8Array, label: string): unknown {
  let text: string;
  try {
    text = typeof raw === 'string' ? raw : new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
  try {
    return JSON.parse(text!);
  } catch {
    fail(`${label} is not valid JSON`);
  }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('manifest contains a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  fail(`manifest cannot contain ${typeof value}`);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** SHA-256 of exact persisted bytes, never of a parsed or reserialized value. */
export function sha256RawBytes(raw: string | Uint8Array): Sha256Digest {
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
}

/** Canonical semantic identity of an unsigned manifest. */
export function deliveryEvidenceManifestId(manifest: DeliveryEvidenceManifestUnsigned): Sha256Digest {
  return sha256RawBytes(stableJson(manifest));
}

/** Strictly parse the manifest wire shape without consulting a builder. */
export function parseDeliveryEvidenceManifest(raw: string | Uint8Array): DeliveryEvidenceManifest {
  const value = parseJson(raw, 'manifest JSON');
  if (!isRecord(value)) fail('manifest must be an object');
  exactKeys(value, MANIFEST_KEYS, 'manifest');
  if (value['schemaVersion'] !== 2) fail('schemaVersion must be 2');
  if (!EVENTS.has(value['event'] as DeliveryEvidenceEvent)) fail('event is unsupported');
  if (typeof value['headSha'] !== 'string' || !/^[0-9a-f]{40}$/u.test(value['headSha'])) {
    fail('headSha must be a full Git SHA');
  }
  digest(value['manifestId'], 'manifestId');
  if (value['verdict'] !== 'accepted') fail('verdict must be accepted');

  if (!isRecord(value['plan'])) fail('plan must be an object');
  exactKeys(value['plan'], PLAN_KEYS, 'plan');
  digest(value['plan']['id'], 'plan.id');
  digest(value['plan']['digest'], 'plan.digest');
  if (value['plan']['path'] !== '.liteship/affected-plan.json') fail('plan.path is invalid');

  if (!isRecord(value['github'])) fail('github must be an object');
  exactKeys(value['github'], GITHUB_KEYS, 'github');
  for (const key of GITHUB_KEYS) nonEmpty(value['github'][key], `github.${key}`);
  if (!/^[1-9][0-9]*$/u.test(value['github']['runId'] as string)) fail('github.runId is invalid');
  if (!/^[1-9][0-9]*$/u.test(value['github']['runAttempt'] as string)) fail('github.runAttempt is invalid');
  if (!(value['github']['ref'] as string).startsWith('refs/')) fail('github.ref is invalid');

  const parseSupporting = (
    item: unknown,
    label: string,
    expected: { readonly kind: string; readonly path: string; readonly verifier: string },
  ): void => {
    if (!isRecord(item)) fail(`${label} must be an object`);
    exactKeys(item, SUPPORTING_EVIDENCE_KEYS, label);
    digest(item['id'], `${label}.id`);
    digest(item['digest'], `${label}.digest`);
    if (item['kind'] !== expected.kind) fail(`${label}.kind is invalid`);
    if (item['path'] !== expected.path) fail(`${label}.path is invalid`);
    if (item['verifier'] !== expected.verifier) fail(`${label}.verifier is invalid`);
  };
  parseSupporting(value['intent'], 'intent', {
    kind: 'change-intent',
    path: 'reports/change-intent.json',
    verifier: 'delivery-evidence/change-intent-v1',
  });
  parseSupporting(value['authority'], 'authority', {
    kind: 'ci-authority',
    path: 'reports/ci-authority.json',
    verifier: 'delivery-evidence/ci-authority-v1',
  });
  if (value['governedExceptions'] !== null) {
    parseSupporting(value['governedExceptions'], 'governedExceptions', {
      kind: 'governed-exceptions',
      path: 'reports/governed-exceptions.json',
      verifier: 'delivery-evidence/governed-exceptions-v1',
    });
  }

  if (!Array.isArray(value['evidence'])) fail('evidence must be an array');
  for (const [index, item] of value['evidence'].entries()) {
    if (!isRecord(item)) fail(`evidence[${index}] must be an object`);
    exactKeys(item, EVIDENCE_KEYS, `evidence[${index}]`);
    nonEmpty(item['id'], `evidence[${index}].id`);
    if (!EVIDENCE_ID_PATTERN.test(item['id'])) fail(`evidence[${index}].id is invalid`);
    digest(item['evidenceId'], `evidence[${index}].evidenceId`);
    nonEmpty(item['checkId'], `evidence[${index}].checkId`);
    if (!CHECK_ID_PATTERN.test(item['checkId'])) fail(`evidence[${index}].checkId is invalid`);
    if (item['kind'] !== 'check-report') fail(`evidence[${index}].kind is invalid`);
    normalizedPath(item['path'], `evidence[${index}].path`);
    digest(item['digest'], `evidence[${index}].digest`);
    nonEmpty(item['producer'], `evidence[${index}].producer`);
    nonEmpty(item['command'], `evidence[${index}].command`);
    if (item['verifier'] !== 'delivery-evidence/check-report-v1') fail(`evidence[${index}].verifier is invalid`);
    if (!Array.isArray(item['platforms']) || item['platforms'].length === 0) {
      fail(`evidence[${index}].platforms must be non-empty`);
    }
    for (const platform of item['platforms']) nonEmpty(platform, `evidence[${index}].platform`);
  }

  if (!isRecord(value['metrics'])) fail('metrics must be an object');
  exactKeys(value['metrics'], METRICS_KEYS, 'metrics');
  digest(value['metrics']['id'], 'metrics.id');
  digest(value['metrics']['digest'], 'metrics.digest');
  if (value['metrics']['kind'] !== 'delivery-metrics') fail('metrics.kind is invalid');
  if (value['metrics']['path'] !== 'reports/delivery-metrics.json') fail('metrics.path is invalid');
  if (value['metrics']['verifier'] !== 'delivery-evidence/metrics-v2') fail('metrics.verifier is invalid');

  return deepFreeze(value as unknown as DeliveryEvidenceManifest);
}

/** Parse JSON bytes for a subordinate evidence schema. */
export function parseEvidenceJson(raw: Uint8Array, label: string): unknown {
  return parseJson(raw, label);
}

/** Canonical digest used by addressed delivery metrics. */
export function semanticSha256(value: unknown): Sha256Digest {
  return sha256RawBytes(stableJson(value));
}

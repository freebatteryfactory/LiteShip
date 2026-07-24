/** Standalone verifier for frozen-head delivery evidence. Never imports the manifest builder. @module */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { parseAffectedTestPlan, type AffectedTestPlan } from './affected-test-plan.js';
import { requiredAuthorityJobs } from './ci-authority.js';
import { parseCiAuthorityEvidence } from './ci-authority-evidence.js';
import { jobNameMatches, selectCheckEvidence } from './ci-evidence-selection.js';
import {
  parseCheckExecutionEvidence,
  type CheckExecutionEvidence,
  type ObservedGithubJob,
} from './check-execution-evidence.js';
import { admitChangeIntent, parseChangeIntent } from './change-intent.js';
import {
  deliveryEvidenceManifestId,
  parseDeliveryEvidenceManifest,
  parseEvidenceJson,
  sha256RawBytes,
  type DeliveryEvidenceEvent,
  type DeliveryEvidenceManifest,
} from './delivery-evidence-schema.js';
import { parseDeliveryMetrics, type DeliveryMetrics } from './delivery-metrics.js';

export interface TrustedDeliveryGithubContext {
  readonly event: DeliveryEvidenceEvent;
  readonly headSha: string;
  readonly repository: string;
  readonly workflow: string;
  readonly runId: string;
  readonly runAttempt: string;
  readonly ref: string;
  /** Independently fetched by the admission host; never serialized in the manifest. */
  readonly observedJobs: readonly ObservedGithubJob[];
}

export interface VerifyDeliveryEvidenceInput {
  readonly manifestJson: string | Uint8Array;
  readonly rawPlanBytes: string | Uint8Array;
  readonly evidenceRoot: string;
  readonly expected: TrustedDeliveryGithubContext;
}

export interface VerifiedDeliveryEvidence {
  readonly manifest: DeliveryEvidenceManifest;
  readonly plan: AffectedTestPlan;
  readonly checkEvidence: readonly CheckExecutionEvidence[];
  readonly metrics: DeliveryMetrics;
}

function fail(message: string): never {
  throw new TypeError(`delivery evidence verification failed: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function duplicate(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function validateExpected(expected: TrustedDeliveryGithubContext): void {
  const actualKeys = Object.keys(expected).sort();
  const expectedKeys = [
    'event',
    'headSha',
    'repository',
    'workflow',
    'runId',
    'runAttempt',
    'ref',
    'observedJobs',
  ].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) fail('trusted GitHub context keys are invalid');
  if (!/^[0-9a-f]{40}$/u.test(expected.headSha)) fail('trusted headSha is invalid');
  for (const key of ['repository', 'workflow'] as const) {
    if (expected[key].length === 0 || expected[key].trim() !== expected[key]) fail(`trusted ${key} is invalid`);
  }
  for (const key of ['runId', 'runAttempt'] as const) {
    if (!/^[1-9][0-9]*$/u.test(expected[key])) fail(`trusted ${key} is invalid`);
  }
  if (!expected.ref.startsWith('refs/')) fail('trusted ref is invalid');
  if (!Array.isArray(expected.observedJobs) || expected.observedJobs.length === 0) {
    fail('trusted observedJobs must be non-empty');
  }
  const attempts = new Set<string>();
  for (const [index, job] of expected.observedJobs.entries()) {
    if (Object.keys(job).sort().join(',') !== 'completedAt,conclusion,name,runAttempt,startedAt') {
      fail(`trusted observedJobs[${index}] keys are invalid`);
    }
    if (
      job.name.length === 0 ||
      job.name.trim() !== job.name ||
      (job.conclusion !== null && (job.conclusion.length === 0 || job.conclusion.trim() !== job.conclusion)) ||
      !Number.isFinite(Date.parse(job.startedAt)) ||
      !Number.isFinite(Date.parse(job.completedAt)) ||
      Date.parse(job.completedAt) < Date.parse(job.startedAt) ||
      job.runAttempt !== Number(expected.runAttempt)
    ) {
      fail(`trusted observedJobs[${index}] is invalid`);
    }
    const identity = `${job.name}\0${job.runAttempt}`;
    if (attempts.has(identity)) fail(`trusted observedJobs contains duplicate ${job.name}`);
    attempts.add(identity);
  }
}

function rawBytes(raw: string | Uint8Array): Uint8Array {
  return typeof raw === 'string' ? Buffer.from(raw, 'utf8') : raw;
}

function readContained(root: string, path: string): Uint8Array {
  const physicalRoot = realpathSync(resolve(root));
  const physicalFile = realpathSync(resolve(physicalRoot, path));
  const fromRoot = relative(physicalRoot, physicalFile);
  if (fromRoot === '' || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    fail(`evidence path escapes root: ${path}`);
  }
  return readFileSync(physicalFile);
}

function parsePlan(raw: string | Uint8Array): AffectedTestPlan {
  const value = parseEvidenceJson(rawBytes(raw), 'affected plan');
  return parseAffectedTestPlan(value);
}

function verifyChangeIntent(raw: Uint8Array, plan: AffectedTestPlan, expected: TrustedDeliveryGithubContext): string {
  const value = parseEvidenceJson(raw, 'change intent');
  if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'admission,intent,origin') {
    fail('change intent envelope is invalid');
  }
  if (!['declared', 'push-fail-broad', 'tag-fail-broad'].includes(String(value['origin']))) {
    fail('change intent origin is invalid');
  }
  const admittedOrigins =
    expected.event === 'pull_request'
      ? ['declared']
      : expected.ref.startsWith('refs/tags/')
        ? ['declared', 'tag-fail-broad']
        : ['declared', 'push-fail-broad'];
  if (!admittedOrigins.includes(value['origin'] as string)) fail('change intent origin is foreign to this event/ref');
  const intent = parseChangeIntent(value['intent']);
  const admission = admitChangeIntent(intent);
  if (!admission.accepted) fail(`change intent was not admitted: ${admission.reasons.join(', ')}`);
  if (
    !isRecord(value['admission']) ||
    Object.keys(value['admission']).sort().join(',') !== 'accepted,intentId,reasons'
  ) {
    fail('change intent admission envelope is invalid');
  }
  if (
    value['admission']['accepted'] !== true ||
    value['admission']['intentId'] !== admission.intentId ||
    !Array.isArray(value['admission']['reasons']) ||
    value['admission']['reasons'].length !== 0
  ) {
    fail('change intent admission does not match the independent policy fold');
  }
  if (intent.sourceSha.value !== plan.headSha || intent.sourceSha.provenance !== 'github-verified') {
    fail('change intent source SHA is not GitHub-verified for the admitted plan');
  }
  const [owner, name, ...rest] = expected.repository.split('/');
  if (
    owner === undefined ||
    name === undefined ||
    rest.length !== 0 ||
    intent.repositoryIdentity.provenance !== 'github-verified' ||
    intent.repositoryIdentity.value.host !== 'github.com' ||
    intent.repositoryIdentity.value.owner !== owner ||
    intent.repositoryIdentity.value.name !== name
  ) {
    fail('change intent repository identity is foreign');
  }
  return intent.intentId;
}

function verifyAuthority(raw: Uint8Array, plan: AffectedTestPlan, expected: TrustedDeliveryGithubContext): string {
  const authority = parseCiAuthorityEvidence(parseEvidenceJson(raw, 'CI authority'));
  for (const key of ['repository', 'workflow', 'runId', 'runAttempt', 'event', 'ref', 'headSha'] as const) {
    if (authority.identity[key] !== expected[key]) fail(`CI authority ${key} is foreign`);
  }
  const requiredJobs = requiredAuthorityJobs({
    event: expected.event,
    ref: expected.ref,
    browserAffected: plan.browserRequired,
  });
  if (!sameStrings(authority.requiredJobs, requiredJobs)) fail('CI authority required jobs are stale or foreign');
  if (authority.verdict !== 'accepted') fail('CI authority verdict is not accepted');
  const attempt = Number(expected.runAttempt);
  if (authority.jobs.some((job) => job.runAttempt !== attempt)) fail('CI authority contains a foreign run attempt');
  duplicate(
    authority.jobs.map((job) => `${job.name}\0${job.runAttempt}`),
    'CI authority job attempt',
  );
  const trustedAuthorityJobs = expected.observedJobs.filter((job) =>
    requiredJobs.some((required) => jobNameMatches(job.name, required)),
  );
  if (!sameJobs(authority.jobs, trustedAuthorityJobs)) {
    fail('CI authority jobs do not exactly match trusted GitHub observations');
  }
  return authority.evidenceId;
}

function verifyGovernedExceptions(raw: Uint8Array): void {
  const value = parseEvidenceJson(raw, 'governed exceptions');
  if (!Array.isArray(value)) fail('governed exceptions must be an array');
  const keys = [
    'owner',
    'scope',
    'rationale',
    'compensatingProof',
    'effectiveDate',
    'expiry',
    'status',
    'sourceKind',
    'sourceId',
    'sourcePath',
  ].sort();
  const identities = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item) || JSON.stringify(Object.keys(item).sort()) !== JSON.stringify(keys)) {
      fail(`governed exceptions[${index}] is malformed`);
    }
    for (const key of keys) {
      if (typeof item[key] !== 'string' || item[key].length === 0)
        fail(`governed exceptions[${index}].${key} is invalid`);
    }
    if (!['active', 'expired', 'stale'].includes(item['status'] as string)) {
      fail(`governed exceptions[${index}].status is invalid`);
    }
    if (item['status'] !== 'active') fail(`governed exceptions[${index}] is not active`);
    if (!['standards-signoff', 'testing-ledger-waiver', 'obligation'].includes(item['sourceKind'] as string)) {
      fail(`governed exceptions[${index}].sourceKind is invalid`);
    }
    const identity = `${item['sourceKind']}\0${item['sourceId']}`;
    if (identities.has(identity)) fail(`duplicate governed exception ${String(item['sourceId'])}`);
    identities.add(identity);
  }
}

function jobIdentity(job: ObservedGithubJob): string {
  return JSON.stringify([job.name, job.conclusion, job.startedAt, job.completedAt, job.runAttempt]);
}

function sameJobs(left: readonly ObservedGithubJob[], right: readonly ObservedGithubJob[]): boolean {
  return sameStrings(left.map(jobIdentity), right.map(jobIdentity));
}

function verifyJobs(
  actual: CheckExecutionEvidence,
  expectedNames: readonly string[],
  expected: TrustedDeliveryGithubContext,
): void {
  const attempt = Number(expected.runAttempt);
  if (actual.producer.jobs.some((job) => job.runAttempt !== attempt)) fail(`${actual.checkId} job attempt is foreign`);
  for (const expected of expectedNames) {
    if (!actual.producer.jobs.some((job) => jobNameMatches(job.name, expected))) {
      fail(`${actual.checkId} is missing producer job ${expected}`);
    }
  }
  for (const job of actual.producer.jobs) {
    if (!expectedNames.some((expected) => jobNameMatches(job.name, expected))) {
      fail(`${actual.checkId} contains foreign producer job ${job.name}`);
    }
  }
  const trustedSubset = expected.observedJobs.filter((job) =>
    expectedNames.some((expectedName) => jobNameMatches(job.name, expectedName)),
  );
  if (!sameJobs(actual.producer.jobs, trustedSubset)) {
    fail(`${actual.checkId} jobs do not exactly match trusted GitHub observations`);
  }
}

/**
 * Independently reconstruct delivery admission from raw plan and evidence
 * bytes. This verifier deliberately has no dependency on a manifest builder.
 */
export function verifyStandaloneDeliveryEvidence(input: VerifyDeliveryEvidenceInput): VerifiedDeliveryEvidence {
  validateExpected(input.expected);
  const manifest = parseDeliveryEvidenceManifest(input.manifestJson);
  const planBytes = rawBytes(input.rawPlanBytes);
  const plan = parsePlan(planBytes);

  const { manifestId, ...unsignedManifest } = manifest;
  if (manifestId !== deliveryEvidenceManifestId(unsignedManifest)) {
    fail('manifestId does not match manifest contents');
  }
  if (plan.headSha !== input.expected.headSha || manifest.headSha !== input.expected.headSha) {
    fail('headSha does not match trusted GitHub context');
  }
  if (manifest.plan.id !== plan.planId) fail('manifest plan id does not match raw affected plan');
  if (manifest.plan.digest !== sha256RawBytes(planBytes)) fail('manifest plan digest does not match raw plan bytes');
  if (manifest.event !== input.expected.event) fail('manifest event does not match trusted GitHub context');
  for (const key of ['repository', 'workflow', 'runId', 'runAttempt', 'ref'] as const) {
    if (manifest.github[key] !== input.expected[key]) fail(`manifest github.${key} does not match trusted context`);
  }

  const intentBytes = readContained(input.evidenceRoot, manifest.intent.path);
  if (manifest.intent.digest !== sha256RawBytes(intentBytes)) fail('raw change intent digest mismatch');
  if (manifest.intent.id !== verifyChangeIntent(intentBytes, plan, input.expected)) {
    fail('manifest change intent id does not match raw intent');
  }

  const authorityBytes = readContained(input.evidenceRoot, manifest.authority.path);
  if (manifest.authority.digest !== sha256RawBytes(authorityBytes)) fail('raw CI authority digest mismatch');
  if (manifest.authority.id !== verifyAuthority(authorityBytes, plan, input.expected)) {
    fail('manifest CI authority id does not match raw authority');
  }

  const governedPath = resolve(realpathSync(resolve(input.evidenceRoot)), 'reports/governed-exceptions.json');
  if (manifest.governedExceptions === null) {
    if (existsSync(governedPath)) fail('governed exceptions were emitted but omitted from the manifest');
  } else {
    const governedBytes = readContained(input.evidenceRoot, manifest.governedExceptions.path);
    if (manifest.governedExceptions.digest !== sha256RawBytes(governedBytes)) {
      fail('raw governed exceptions digest mismatch');
    }
    if (manifest.governedExceptions.id !== sha256RawBytes(governedBytes)) {
      fail('manifest governed exceptions id does not match raw bytes');
    }
    verifyGovernedExceptions(governedBytes);
  }

  const selected = selectCheckEvidence(plan, manifest.event);
  if (selected.length === 0 || manifest.evidence.length === 0) fail('complete delivery evidence cannot be empty');
  duplicate(
    manifest.evidence.map((entry) => entry.id),
    'evidence requirement id',
  );
  duplicate(
    manifest.evidence.map((entry) => entry.checkId),
    'evidence check id',
  );
  duplicate(
    manifest.evidence.map((entry) => entry.path),
    'evidence path',
  );
  const expectedIds = selected.map((entry) => entry.requirement.id);
  const actualIds = manifest.evidence.map((entry) => entry.id);
  if (JSON.stringify(actualIds) !== JSON.stringify([...actualIds].sort())) {
    fail('manifest evidence references are not in canonical id order');
  }
  if (!sameStrings(actualIds, expectedIds)) {
    const missing = expectedIds.filter((id) => !actualIds.includes(id));
    const foreign = actualIds.filter((id) => !expectedIds.includes(id));
    fail(
      `evidence closure mismatch (missing: ${missing.join(', ') || 'none'}; foreign: ${foreign.join(', ') || 'none'})`,
    );
  }

  const parsedEvidence: CheckExecutionEvidence[] = [];
  for (const selection of selected) {
    const requirement = selection.requirement;
    const reference = manifest.evidence.find((entry) => entry.id === requirement.id);
    if (reference === undefined) fail(`missing evidence reference ${requirement.id}`);
    if (
      reference.checkId !== requirement.checkId ||
      reference.kind !== requirement.kind ||
      reference.path !== requirement.path ||
      reference.producer !== requirement.producer ||
      reference.command !== requirement.command ||
      reference.verifier !== requirement.verifier ||
      !sameStrings(reference.platforms, selection.platforms)
    ) {
      fail(`manifest reference does not match requirement ${requirement.id}`);
    }

    const bytes = readContained(input.evidenceRoot, reference.path);
    if (reference.digest !== sha256RawBytes(bytes)) fail(`raw evidence digest mismatch: ${reference.id}`);
    const evidence = parseCheckExecutionEvidence(parseEvidenceJson(bytes, reference.id));
    if (reference.evidenceId !== evidence.evidenceId) fail(`semantic evidence id mismatch: ${reference.id}`);
    if (
      evidence.requirementId !== requirement.id ||
      evidence.checkId !== requirement.checkId ||
      evidence.kind !== requirement.kind ||
      evidence.path !== requirement.path ||
      evidence.source.headSha !== plan.headSha ||
      evidence.source.planId !== plan.planId ||
      evidence.producer.checkId !== requirement.producer ||
      evidence.producer.command !== requirement.command ||
      evidence.producer.verifier !== requirement.verifier ||
      !sameStrings(evidence.producer.platforms, selection.platforms)
    ) {
      fail(`raw evidence does not match requirement ${requirement.id}`);
    }
    if (evidence.result.verdict !== 'pass') fail(`${requirement.checkId} did not pass`);
    for (const key of ['repository', 'workflow', 'runId', 'runAttempt'] as const) {
      if (evidence.producer.identity[key] !== input.expected[key]) {
        fail(`${requirement.checkId} producer ${key} is foreign`);
      }
    }
    verifyJobs(evidence, selection.jobNames, input.expected);
    parsedEvidence.push(evidence);
  }

  const metricsBytes = readContained(input.evidenceRoot, manifest.metrics.path);
  if (manifest.metrics.digest !== sha256RawBytes(metricsBytes)) fail('raw delivery metrics digest mismatch');
  const metrics = parseDeliveryMetrics(parseEvidenceJson(metricsBytes, 'delivery metrics'));
  if (metrics.planId !== plan.planId) fail('delivery metrics planId does not match the admitted plan');
  if (metrics.headSha !== plan.headSha) fail('delivery metrics headSha does not match the admitted plan');
  if (metrics.risk !== plan.risk.level || metrics.confidence !== plan.confidence) {
    fail('delivery metrics risk or confidence does not match the admitted plan');
  }
  if (metrics.evidenceSources.selectorCalibrationId !== plan.selectorCalibrationId) {
    fail('delivery metrics selector calibration does not match the admitted plan');
  }
  if (
    metrics.selectionWidth.changedPaths !== plan.changedPaths.length ||
    metrics.selectionWidth.packages !== plan.affectedPackages.length ||
    metrics.selectionWidth.nodeTests !== plan.estimatedCost.selectedNodeTests ||
    metrics.selectionWidth.platforms !== plan.platforms.length
  ) {
    fail('delivery metrics selection width does not match the admitted plan');
  }
  if (metrics.slos.evidenceComplete !== 'pass') fail('delivery metrics do not prove complete evidence');
  if (metrics.slos.artifactIdentity !== 'pass') fail('delivery metrics do not prove admitted artifact identity');
  if (manifest.metrics.id !== metrics.metricsId) fail('manifest metrics id does not match raw metrics');

  return Object.freeze({
    manifest,
    plan,
    checkEvidence: Object.freeze(parsedEvidence),
    metrics,
  });
}

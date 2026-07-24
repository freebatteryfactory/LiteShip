import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { CheckEvidenceManifestRequirement } from '../../packages/command/src/checks/evidence-requirements.js';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import type { AssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import { planAffectedTests, type AffectedTestPlan } from '../../scripts/lib/affected-test-plan.js';
import { requiredAuthorityJobs } from '../../scripts/lib/ci-authority.js';
import { buildCiAuthorityEvidence, serializeCiAuthorityEvidence } from '../../scripts/lib/ci-authority-evidence.js';
import {
  buildCheckExecutionEvidence,
  serializeCheckExecutionEvidence,
  type BuildCheckExecutionEvidenceInput,
} from '../../scripts/lib/check-execution-evidence.js';
import { selectCheckEvidence, type SelectedCheckEvidence } from '../../scripts/lib/ci-evidence-selection.js';
import { admitChangeIntent, buildChangeIntent } from '../../scripts/lib/change-intent.js';
import { buildDeliveryMetrics } from '../../scripts/lib/delivery-metrics.js';
import {
  deliveryEvidenceManifestId,
  sha256RawBytes,
  type DeliveryCheckEvidenceReference,
  type DeliveryEvidenceManifest,
  type DeliveryEvidenceManifestUnsigned,
} from '../../scripts/lib/delivery-evidence-schema.js';
import type { TrustedDeliveryGithubContext } from '../../scripts/lib/delivery-evidence-verifier.js';

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

export interface DeliveryEvidenceFixture {
  readonly root: string;
  readonly plan: AffectedTestPlan;
  readonly planBytes: string;
  readonly expected: TrustedDeliveryGithubContext;
  readonly selected: readonly SelectedCheckEvidence[];
  readonly unsigned: DeliveryEvidenceManifestUnsigned;
  readonly manifest: DeliveryEvidenceManifest;
}

export function finalizedManifest(unsigned: DeliveryEvidenceManifestUnsigned): DeliveryEvidenceManifest {
  return { ...unsigned, manifestId: deliveryEvidenceManifestId(unsigned) };
}

export function serializedManifest(unsigned: DeliveryEvidenceManifestUnsigned): string {
  return `${JSON.stringify(finalizedManifest(unsigned), null, 2)}\n`;
}

export function writeRaw(root: string, path: string, raw: string | Uint8Array): void {
  const target = join(root, ...path.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, raw);
}

export function writeCheckEvidence(
  fixture: Pick<DeliveryEvidenceFixture, 'root' | 'plan' | 'expected'>,
  selection: SelectedCheckEvidence,
  overrides: Partial<BuildCheckExecutionEvidenceInput> = {},
): DeliveryCheckEvidenceReference {
  const evidence = buildCheckExecutionEvidence({
    requirement: selection.requirement,
    headSha: fixture.plan.headSha,
    planId: fixture.plan.planId,
    identity: {
      repository: fixture.expected.repository,
      workflow: fixture.expected.workflow,
      runId: fixture.expected.runId,
      runAttempt: fixture.expected.runAttempt,
    },
    jobs: fixture.expected.observedJobs.filter((job) =>
      selection.jobNames.some((name) => job.name === name || job.name.startsWith(`${name} (`)),
    ),
    platforms: selection.platforms,
    ...overrides,
  });
  const raw = serializeCheckExecutionEvidence(evidence);
  writeRaw(fixture.root, selection.requirement.path, raw);
  return {
    id: selection.requirement.id,
    evidenceId: evidence.evidenceId,
    checkId: selection.requirement.checkId,
    kind: 'check-report',
    path: selection.requirement.path,
    digest: sha256RawBytes(raw),
    producer: selection.requirement.producer,
    command: selection.requirement.command,
    verifier: selection.requirement.verifier,
    platforms: selection.platforms,
  };
}

export function createDeliveryEvidenceFixture(): DeliveryEvidenceFixture {
  const root = mkdtempSync(join(tmpdir(), 'liteship-delivery-verifier-'));
  const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory, {
    baseRef: 'origin/main',
    baseSha: 'a'.repeat(40),
    headSha: 'b'.repeat(40),
    confidence: 'high',
    selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
  });
  const event = 'pull_request' as const;
  const ref = 'refs/pull/161/merge';
  const selected = selectCheckEvidence(plan, event);
  const authorityJobs = requiredAuthorityJobs({ event, ref, browserAffected: plan.browserRequired });
  const observedJobs = [...new Set([...authorityJobs, ...selected.flatMap((selection) => selection.jobNames)])]
    .sort()
    .map((name, index) => ({
      name,
      conclusion: 'success',
      startedAt: `2026-07-24T13:00:${String(index * 2).padStart(2, '0')}.000Z`,
      completedAt: `2026-07-24T13:00:${String(index * 2 + 1).padStart(2, '0')}.000Z`,
      runAttempt: 1,
    }));
  const expected: TrustedDeliveryGithubContext = {
    event,
    headSha: plan.headSha,
    repository: 'freebatteryfactory/LiteShip',
    workflow: 'CI',
    runId: '12345',
    runAttempt: '1',
    ref,
    observedJobs,
  };
  const fixtureBase = { root, plan, expected };
  const evidence = selected.map((selection) => writeCheckEvidence(fixtureBase, selection));
  const metrics = buildDeliveryMetrics({
    plan,
    reports: [],
    timings: { queueMs: 10, feedbackLatencyMs: 100, buildMs: 20, testMs: 30, totalComputeMs: 60 },
    jobAttempts: selected.length,
    reruns: 0,
    knownFlakyReruns: 0,
    flakeAttempts: 1,
    requiredEvidence: selected.length,
    presentEvidence: selected.length,
    escapedDefects: 0,
    artifactMismatches: 0,
    selectorMisses: 0,
    flakeEvidenceId: `sha256:${createHash('sha256').update('flake-fixture').digest('hex')}`,
  });
  const metricsRaw = `${JSON.stringify(metrics, null, 2)}\n`;
  writeRaw(root, 'reports/delivery-metrics.json', metricsRaw);
  const intent = buildChangeIntent({
    schemaVersion: 1,
    sponsor: { value: { login: 'heyoub', ownership: 'repository-owner' }, provenance: 'github-verified' },
    hypothesis: { value: 'The evidence-native change is admitted.', provenance: 'agent-self-declared' },
    affectedUserSurface: {
      value: { visibility: 'trust-boundary', areas: ['delivery evidence'] },
      provenance: 'agent-self-declared',
    },
    expectedOutcome: { value: 'Independent verification reconstructs the verdict.', provenance: 'agent-self-declared' },
    guardrails: { value: ['no self-attestation'], provenance: 'agent-self-declared' },
    reversibility: {
      value: { kind: 'reversible', rollback: 'Revert the source commit.' },
      provenance: 'agent-self-declared',
    },
    actorClass: { value: 'agent', provenance: 'agent-self-declared' },
    uncertainty: { value: { level: 'low', unknowns: [] }, provenance: 'agent-self-declared' },
    sourceSha: { value: plan.headSha, provenance: 'github-verified' },
    repositoryIdentity: {
      value: { host: 'github.com', owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_fixture' },
      provenance: 'github-verified',
    },
  });
  const admission = admitChangeIntent(intent);
  if (!admission.accepted) throw new TypeError('fixture change intent was not admitted');
  const intentRaw = `${JSON.stringify({ origin: 'declared', intent, admission }, null, 2)}\n`;
  writeRaw(root, 'reports/change-intent.json', intentRaw);

  const authority = buildCiAuthorityEvidence({
    identity: {
      repository: expected.repository,
      workflow: expected.workflow,
      runId: expected.runId,
      runAttempt: expected.runAttempt,
      event: expected.event,
      ref: expected.ref,
      headSha: expected.headSha,
    },
    requiredJobs: authorityJobs,
    jobs: expected.observedJobs.filter((job) => authorityJobs.some((name) => job.name === name)),
  });
  const authorityRaw = serializeCiAuthorityEvidence(authority);
  writeRaw(root, 'reports/ci-authority.json', authorityRaw);
  const governedRaw = '[]\n';
  writeRaw(root, 'reports/governed-exceptions.json', governedRaw);
  const planBytes = `${JSON.stringify(plan, null, 2)}\n`;
  const unsigned: DeliveryEvidenceManifestUnsigned = {
    schemaVersion: 2,
    event: expected.event,
    headSha: plan.headSha,
    plan: {
      id: plan.planId,
      path: '.liteship/affected-plan.json',
      digest: sha256RawBytes(planBytes),
    },
    github: {
      repository: expected.repository,
      workflow: expected.workflow,
      runId: expected.runId,
      runAttempt: expected.runAttempt,
      ref: expected.ref,
    },
    intent: {
      id: intent.intentId,
      kind: 'change-intent',
      path: 'reports/change-intent.json',
      digest: sha256RawBytes(intentRaw),
      verifier: 'delivery-evidence/change-intent-v1',
    },
    authority: {
      id: authority.evidenceId,
      kind: 'ci-authority',
      path: 'reports/ci-authority.json',
      digest: sha256RawBytes(authorityRaw),
      verifier: 'delivery-evidence/ci-authority-v1',
    },
    governedExceptions: {
      id: sha256RawBytes(governedRaw),
      kind: 'governed-exceptions',
      path: 'reports/governed-exceptions.json',
      digest: sha256RawBytes(governedRaw),
      verifier: 'delivery-evidence/governed-exceptions-v1',
    },
    evidence,
    metrics: {
      id: metrics.metricsId,
      kind: 'delivery-metrics',
      path: 'reports/delivery-metrics.json',
      digest: sha256RawBytes(metricsRaw),
      verifier: 'delivery-evidence/metrics-v2',
    },
    verdict: 'accepted',
  };
  return { root, plan, planBytes, expected, selected, unsigned, manifest: finalizedManifest(unsigned) };
}

export function removeDeliveryEvidenceFixture(fixture: DeliveryEvidenceFixture): void {
  rmSync(fixture.root, { recursive: true, force: true });
}

export function requirementWith(
  requirement: CheckEvidenceManifestRequirement,
  mutation: Partial<CheckEvidenceManifestRequirement>,
): CheckEvidenceManifestRequirement {
  return { ...requirement, ...mutation };
}

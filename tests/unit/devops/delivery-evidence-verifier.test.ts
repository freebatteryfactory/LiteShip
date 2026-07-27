import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { buildCiAuthorityEvidence, serializeCiAuthorityEvidence } from '../../../scripts/lib/ci-authority-evidence.js';
import { admitChangeIntent, buildChangeIntent } from '../../../scripts/lib/change-intent.js';
import {
  createDeliveryEvidenceFixture,
  finalizedManifest,
  removeDeliveryEvidenceFixture,
  serializedManifest,
  writeCheckEvidence,
  writeRaw,
  type DeliveryEvidenceFixture,
} from '../../support/delivery-evidence-fixture.js';
import {
  semanticSha256,
  sha256RawBytes,
  type DeliveryEvidenceManifestUnsigned,
} from '../../../scripts/lib/delivery-evidence-schema.js';
import { verifyStandaloneDeliveryEvidence } from '../../../scripts/lib/delivery-evidence-verifier.js';

let fixture: DeliveryEvidenceFixture | undefined;

function current(): DeliveryEvidenceFixture {
  fixture ??= createDeliveryEvidenceFixture();
  return fixture;
}

function verify(unsigned: DeliveryEvidenceManifestUnsigned = current().unsigned) {
  const value = current();
  return verifyStandaloneDeliveryEvidence({
    manifestJson: serializedManifest(unsigned),
    rawPlanBytes: value.planBytes,
    evidenceRoot: value.root,
    expected: value.expected,
  });
}

afterEach(() => {
  if (fixture !== undefined) removeDeliveryEvidenceFixture(fixture);
  fixture = undefined;
});

describe('standalone delivery evidence verifier', () => {
  test('reconstructs admission from raw plan, check, and metrics bytes', () => {
    const admitted = verify();
    expect(admitted.plan.planId).toBe(current().plan.planId);
    expect(admitted.checkEvidence).toHaveLength(current().selected.length);
    expect(admitted.metrics['planId']).toBe(current().plan.planId);
    expect(Object.isFrozen(admitted.manifest.evidence)).toBe(true);
  });

  test('has no dependency on the delivery manifest builder', () => {
    const source = readFileSync('scripts/lib/delivery-evidence-verifier.ts', 'utf8');
    expect(source).not.toContain("from './delivery-evidence.js'");
    expect(source).not.toContain('buildDeliveryEvidenceManifest');
  });

  test('rejects a forged manifest identity and raw-plan byte drift', () => {
    const value = current();
    expect(() =>
      verifyStandaloneDeliveryEvidence({
        manifestJson: `${JSON.stringify({ ...value.manifest, manifestId: `sha256:${'0'.repeat(64)}` })}\n`,
        rawPlanBytes: value.planBytes,
        evidenceRoot: value.root,
        expected: value.expected,
      }),
    ).toThrow(/manifestId/u);
    expect(() =>
      verifyStandaloneDeliveryEvidence({
        manifestJson: `${JSON.stringify(value.manifest)}\n`,
        rawPlanBytes: `${value.planBytes} `,
        evidenceRoot: value.root,
        expected: value.expected,
      }),
    ).toThrow(/plan digest/u);
  });

  test('rejects empty, missing, duplicate, and foreign evidence closure', () => {
    const value = current();
    expect(() => verify({ ...value.unsigned, evidence: [] })).toThrow(/cannot be empty/u);
    expect(() => verify({ ...value.unsigned, evidence: value.unsigned.evidence.slice(1) })).toThrow(
      /closure mismatch/u,
    );
    expect(() =>
      verify({ ...value.unsigned, evidence: [value.unsigned.evidence[0]!, ...value.unsigned.evidence] }),
    ).toThrow(/duplicate/u);
    const first = value.unsigned.evidence[0]!;
    const foreign = {
      ...first,
      id: 'evidence/check/foreign',
      checkId: 'check/foreign',
      path: 'reports/checks/foreign.json',
      producer: 'check/foreign',
    };
    const withForeign = [...value.unsigned.evidence, foreign].sort((left, right) => left.id.localeCompare(right.id));
    expect(() => verify({ ...value.unsigned, evidence: withForeign })).toThrow(/closure mismatch/u);
  });

  test.each([
    ['checkId', 'check/foreign'],
    ['path', 'reports/checks/foreign.json'],
    ['producer', 'check/foreign'],
    ['command', 'pnpm run foreign'],
    ['platforms', ['foreign']],
  ] as const)('rejects a manifest reference with foreign %s', (key, replacement) => {
    const value = current();
    const [first, ...rest] = value.unsigned.evidence;
    const mutated = { ...first!, [key]: replacement };
    expect(() => verify({ ...value.unsigned, evidence: [mutated, ...rest] })).toThrow(/does not match requirement/u);
  });

  test('rejects foreign producer identity, failed jobs, and foreign job attempts from valid evidence records', () => {
    const value = current();
    const selection = value.selected[0]!;

    const foreignIdentity = writeCheckEvidence(value, selection, {
      identity: {
        repository: 'foreign/repository',
        workflow: value.expected.workflow,
        runId: value.expected.runId,
        runAttempt: value.expected.runAttempt,
      },
    });
    expect(() =>
      verify({ ...value.unsigned, evidence: [foreignIdentity, ...value.unsigned.evidence.slice(1)] }),
    ).toThrow(/producer repository is foreign/u);

    const failed = writeCheckEvidence(value, selection, {
      jobs: [
        {
          name: selection.jobNames[0]!,
          conclusion: 'failure',
          startedAt: '2026-07-24T12:00:00.000Z',
          completedAt: '2026-07-24T12:00:01.000Z',
          runAttempt: 1,
        },
        ...selection.jobNames.slice(1).map((name) => ({
          name,
          conclusion: 'success',
          startedAt: '2026-07-24T12:00:02.000Z',
          completedAt: '2026-07-24T12:00:03.000Z',
          runAttempt: 1,
        })),
      ],
    });
    expect(() => verify({ ...value.unsigned, evidence: [failed, ...value.unsigned.evidence.slice(1)] })).toThrow(
      /did not pass/u,
    );

    const foreignAttempt = writeCheckEvidence(value, selection, {
      jobs: selection.jobNames.map((name) => ({
        name,
        conclusion: 'success',
        startedAt: '2026-07-24T12:00:00.000Z',
        completedAt: '2026-07-24T12:00:01.000Z',
        runAttempt: 2,
      })),
    });
    expect(() =>
      verify({ ...value.unsigned, evidence: [foreignAttempt, ...value.unsigned.evidence.slice(1)] }),
    ).toThrow(/job attempt is foreign/u);
  });

  test('rejects trusted GitHub context drift independently of self-declared manifest identity', () => {
    const value = current();
    for (const expected of [
      { ...value.expected, repository: 'foreign/repository' },
      { ...value.expected, workflow: 'Foreign' },
      { ...value.expected, runId: '999' },
      { ...value.expected, runAttempt: '2' },
      { ...value.expected, headSha: 'd'.repeat(40) },
    ]) {
      expect(() =>
        verifyStandaloneDeliveryEvidence({
          manifestJson: serializedManifest(value.unsigned),
          rawPlanBytes: value.planBytes,
          evidenceRoot: value.root,
          expected,
        }),
      ).toThrow();
    }
  });

  test('rejects a collector-forged success against independently observed GitHub failure', () => {
    const value = current();
    const [first, ...rest] = value.expected.observedJobs;
    expect(first).toBeDefined();
    const expected = {
      ...value.expected,
      observedJobs: [{ ...first!, conclusion: 'failure' }, ...rest],
    };
    expect(() =>
      verifyStandaloneDeliveryEvidence({
        manifestJson: serializedManifest(value.unsigned),
        rawPlanBytes: value.planBytes,
        evidenceRoot: value.root,
        expected,
      }),
    ).toThrow(/exactly match trusted GitHub observations/u);
  });

  test('recomputes metrics raw bytes and refuses foreign plan/head bindings', () => {
    const value = current();
    const metricsPath = join(value.root, 'reports', 'delivery-metrics.json');
    const original = JSON.parse(readFileSync(metricsPath, 'utf8')) as Record<string, unknown>;
    const { metricsId: _ignored, ...unsignedOriginal } = original;
    const unsigned = { ...unsignedOriginal, planId: `sha256:${'d'.repeat(64)}` };
    const foreign = { ...unsigned, metricsId: semanticSha256(unsigned) };
    const raw = `${JSON.stringify(foreign, null, 2)}\n`;
    writeRaw(value.root, 'reports/delivery-metrics.json', raw);
    expect(() =>
      verify({ ...value.unsigned, metrics: { ...value.unsigned.metrics, digest: sha256RawBytes(raw) } }),
    ).toThrow(/metrics planId/u);
  });

  test('refuses metrics that have not crossed artifact admission', () => {
    const value = current();
    const metricsPath = join(value.root, 'reports', 'delivery-metrics.json');
    const original = JSON.parse(readFileSync(metricsPath, 'utf8')) as Record<string, unknown>;
    const slos = { ...(original['slos'] as Record<string, unknown>), artifactIdentity: 'unknown' };
    const { metricsId: _ignored, ...unsignedOriginal } = original;
    const unsigned = { ...unsignedOriginal, slos, verdict: 'insufficient-evidence' };
    const metrics = { ...unsigned, metricsId: semanticSha256(unsigned) };
    const raw = `${JSON.stringify(metrics, null, 2)}\n`;
    writeRaw(value.root, 'reports/delivery-metrics.json', raw);
    expect(() =>
      verify({
        ...value.unsigned,
        metrics: {
          ...value.unsigned.metrics,
          id: metrics.metricsId,
          digest: sha256RawBytes(raw),
        },
      }),
    ).toThrow(/artifact identity/u);
  });

  test('reconstructs plan-owned risk and selection facts instead of trusting metrics', () => {
    const value = current();
    const metricsPath = join(value.root, 'reports', 'delivery-metrics.json');
    const original = JSON.parse(readFileSync(metricsPath, 'utf8')) as Record<string, unknown>;
    const { metricsId: _ignored, ...unsignedOriginal } = original;
    for (const mutation of [
      { risk: 'critical' },
      {
        selectionWidth: {
          ...(original['selectionWidth'] as Record<string, unknown>),
          changedPaths: 99,
        },
      },
    ]) {
      const unsigned = { ...unsignedOriginal, ...mutation };
      const metrics = { ...unsigned, metricsId: semanticSha256(unsigned) };
      const raw = `${JSON.stringify(metrics, null, 2)}\n`;
      writeRaw(value.root, 'reports/delivery-metrics.json', raw);
      expect(() =>
        verify({
          ...value.unsigned,
          metrics: { ...value.unsigned.metrics, id: metrics.metricsId, digest: sha256RawBytes(raw) },
        }),
      ).toThrow(/risk or confidence|selection width/u);
    }
  });

  test('independently re-admits change intent and refuses a valid but unauthorized declaration', () => {
    const value = current();
    const parsed = JSON.parse(readFileSync(join(value.root, 'reports', 'change-intent.json'), 'utf8')) as {
      origin: string;
      intent: Record<string, unknown>;
    };
    const { intentId: _ignored, ...unsigned } = parsed.intent;
    const sponsor = unsigned['sponsor'] as { value: { login: string; ownership: string }; provenance: string };
    const intent = buildChangeIntent({
      ...unsigned,
      sponsor: { ...sponsor, value: { ...sponsor.value, ownership: 'none' } },
    });
    const admission = admitChangeIntent(intent);
    expect(admission.accepted).toBe(false);
    const raw = `${JSON.stringify({ origin: parsed.origin, intent, admission }, null, 2)}\n`;
    writeRaw(value.root, 'reports/change-intent.json', raw);
    expect(() =>
      verify({
        ...value.unsigned,
        intent: { ...value.unsigned.intent, id: intent.intentId, digest: sha256RawBytes(raw) },
      }),
    ).toThrow(/change intent was not admitted/u);
  });

  test('derives event/ref CI authority jobs instead of trusting an artifact-owned list', () => {
    const value = current();
    const authority = buildCiAuthorityEvidence({
      identity: {
        repository: value.expected.repository,
        workflow: value.expected.workflow,
        runId: value.expected.runId,
        runAttempt: value.expected.runAttempt,
        event: value.expected.event,
        ref: value.expected.ref,
        headSha: value.expected.headSha,
      },
      requiredJobs: ['format'],
      jobs: [
        {
          name: 'format',
          conclusion: 'success',
          startedAt: '2026-07-24T12:00:00.000Z',
          completedAt: '2026-07-24T12:00:01.000Z',
          runAttempt: 1,
        },
      ],
    });
    const raw = serializeCiAuthorityEvidence(authority);
    writeRaw(value.root, 'reports/ci-authority.json', raw);
    expect(() =>
      verify({
        ...value.unsigned,
        authority: { ...value.unsigned.authority, id: authority.evidenceId, digest: sha256RawBytes(raw) },
      }),
    ).toThrow(/required jobs are stale or foreign/u);
  });

  test('requires governed-exception evidence whenever the collector emitted it', () => {
    const value = current();
    expect(() => verify({ ...value.unsigned, governedExceptions: null })).toThrow(/emitted but omitted/u);
  });

  test.each(['expired', 'stale'] as const)('refuses a governed exception whose status is %s', (status) => {
    const value = current();
    const raw = `${JSON.stringify(
      [
        {
          owner: 'maintainer',
          scope: 'check/example',
          rationale: 'Historical exception fixture.',
          compensatingProof: 'tests/unit/example.test.ts',
          effectiveDate: '2026-01-01',
          expiry: '2026-02-01',
          status,
          sourceKind: 'standards-signoff',
          sourceId: 'fixture',
          sourcePath: 'traceability/fixture.yaml',
        },
      ],
      null,
      2,
    )}\n`;
    writeRaw(value.root, 'reports/governed-exceptions.json', raw);
    const digest = sha256RawBytes(raw);
    expect(() =>
      verify({
        ...value.unsigned,
        governedExceptions: { ...value.unsigned.governedExceptions!, id: digest, digest },
      }),
    ).toThrow(/is not active/u);
  });

  test('recomputes each exact evidence file digest before parsing it', () => {
    const value = current();
    const first = value.unsigned.evidence[0]!;
    writeRaw(value.root, first.path, `${readFileSync(join(value.root, ...first.path.split('/')), 'utf8')} `);
    expect(() => verify()).toThrow(/raw evidence digest mismatch/u);
  });

  test('rejects symlink/path escape spellings at the schema boundary', () => {
    const value = current();
    const first = value.unsigned.evidence[0]!;
    expect(() =>
      verify({
        ...value.unsigned,
        evidence: [{ ...first, path: '../foreign.json' }, ...value.unsigned.evidence.slice(1)],
      }),
    ).toThrow(/normalized relative path/u);
  });

  test('the fixture manifest id is a function of every unsigned field', () => {
    const value = current();
    expect(finalizedManifest(value.unsigned)).toEqual(value.manifest);
  });
});

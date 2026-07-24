/** Builder projection from raw delivery evidence into the standalone wire manifest. @module */

import { DAG, HLC, Receipt, TypedRef, type HLC as HLCValue, type ReceiptEnvelope } from '@liteship/core';
import { parseAffectedTestPlan, type AffectedTestPlan } from './affected-test-plan.js';
import { parseCheckExecutionEvidence } from './check-execution-evidence.js';
import { parseCiAuthorityEvidence } from './ci-authority-evidence.js';
import { selectCheckEvidence } from './ci-evidence-selection.js';
import { parseChangeIntent } from './change-intent.js';
import {
  deliveryEvidenceManifestId,
  parseDeliveryEvidenceManifest,
  parseEvidenceJson,
  sha256RawBytes,
  type DeliveryEvidenceEvent,
  type DeliveryEvidenceGithubIdentity,
  type DeliveryEvidenceManifest,
  type DeliveryEvidenceManifestUnsigned,
  type Sha256Digest,
} from './delivery-evidence-schema.js';

export type {
  DeliveryEvidenceGithubIdentity,
  DeliveryEvidenceManifest,
  DeliveryEvidenceManifestUnsigned,
} from './delivery-evidence-schema.js';

export interface DeliveryEvidenceBuilderInput {
  readonly event: DeliveryEvidenceEvent;
  readonly headSha: string;
  readonly github: DeliveryEvidenceGithubIdentity;
  /** Exact persisted bytes downloaded from the affected-plan authority. */
  readonly planBytes: string | Uint8Array;
  /** Exact persisted bytes emitted by the candidate-evidence collector. */
  readonly intentBytes: string | Uint8Array;
  readonly authorityBytes: string | Uint8Array;
  readonly governedExceptionsBytes: string | Uint8Array | null;
  readonly checkEvidenceBytes: ReadonlyMap<string, string | Uint8Array>;
  readonly metricsBytes: string | Uint8Array;
}

function bytes(value: string | Uint8Array): Uint8Array {
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function addressedId(value: unknown, label: string): Sha256Digest {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError(`${label} must be a SHA-256 identity`);
  }
  return value as Sha256Digest;
}

function parsePlan(raw: Uint8Array): AffectedTestPlan {
  return parseAffectedTestPlan(parseEvidenceJson(raw, 'affected plan'));
}

function intentId(raw: Uint8Array): Sha256Digest {
  const envelope = record(parseEvidenceJson(raw, 'change intent'), 'change intent envelope');
  const intent = parseChangeIntent(envelope['intent']);
  return addressedId(intent.intentId, 'change intent id');
}

function metricsId(raw: Uint8Array): Sha256Digest {
  const metrics = record(parseEvidenceJson(raw, 'delivery metrics'), 'delivery metrics');
  return addressedId(metrics['metricsId'], 'delivery metrics id');
}

/**
 * Build one deterministic candidate manifest from exact raw evidence bytes.
 *
 * This builder is deliberately not an admission authority. The host must pass
 * its output to the standalone verifier with an independently fetched GitHub
 * job set before producing an admission receipt.
 */
export function buildDeliveryEvidenceManifest(input: DeliveryEvidenceBuilderInput): DeliveryEvidenceManifest {
  const planBytes = bytes(input.planBytes);
  const plan = parsePlan(planBytes);
  if (plan.headSha !== input.headSha) throw new TypeError('delivery evidence plan head does not match builder head');
  const intentBytes = bytes(input.intentBytes);
  const authorityBytes = bytes(input.authorityBytes);
  const authority = parseCiAuthorityEvidence(parseEvidenceJson(authorityBytes, 'CI authority'));
  const selected = selectCheckEvidence(plan, input.event);
  if (selected.length === 0) throw new TypeError('delivery evidence selection must not be empty');

  const evidence = selected
    .map((selection) => {
      const raw = input.checkEvidenceBytes.get(selection.requirement.path);
      if (raw === undefined) throw new TypeError(`missing raw evidence ${selection.requirement.path}`);
      const rawBytes = bytes(raw);
      const execution = parseCheckExecutionEvidence(parseEvidenceJson(rawBytes, selection.requirement.id));
      return Object.freeze({
        id: selection.requirement.id,
        evidenceId: execution.evidenceId,
        checkId: selection.requirement.checkId,
        kind: 'check-report' as const,
        path: selection.requirement.path,
        digest: sha256RawBytes(rawBytes),
        producer: selection.requirement.producer,
        command: selection.requirement.command,
        verifier: 'delivery-evidence/check-report-v1' as const,
        platforms: Object.freeze([...selection.platforms].sort()),
      });
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const metricsBytes = bytes(input.metricsBytes);
  const unsigned: DeliveryEvidenceManifestUnsigned = {
    schemaVersion: 2,
    event: input.event,
    headSha: input.headSha,
    plan: Object.freeze({
      id: plan.planId,
      path: '.liteship/affected-plan.json',
      digest: sha256RawBytes(planBytes),
    }),
    github: Object.freeze({ ...input.github }),
    intent: Object.freeze({
      id: intentId(intentBytes),
      kind: 'change-intent',
      path: 'reports/change-intent.json',
      digest: sha256RawBytes(intentBytes),
      verifier: 'delivery-evidence/change-intent-v1',
    }),
    authority: Object.freeze({
      id: addressedId(authority.evidenceId, 'CI authority id'),
      kind: 'ci-authority',
      path: 'reports/ci-authority.json',
      digest: sha256RawBytes(authorityBytes),
      verifier: 'delivery-evidence/ci-authority-v1',
    }),
    governedExceptions:
      input.governedExceptionsBytes === null
        ? null
        : Object.freeze({
            id: sha256RawBytes(bytes(input.governedExceptionsBytes)),
            kind: 'governed-exceptions' as const,
            path: 'reports/governed-exceptions.json' as const,
            digest: sha256RawBytes(bytes(input.governedExceptionsBytes)),
            verifier: 'delivery-evidence/governed-exceptions-v1' as const,
          }),
    evidence: Object.freeze(evidence),
    metrics: Object.freeze({
      id: metricsId(metricsBytes),
      kind: 'delivery-metrics',
      path: 'reports/delivery-metrics.json',
      digest: sha256RawBytes(metricsBytes),
      verifier: 'delivery-evidence/metrics-v2',
    }),
    verdict: 'accepted',
  };
  return Object.freeze({ ...unsigned, manifestId: deliveryEvidenceManifestId(unsigned) });
}

/** Structural self-check only; this does not replace independent admission. */
export function verifyDeliveryEvidenceManifest(manifest: DeliveryEvidenceManifest): true {
  parseDeliveryEvidenceManifest(`${JSON.stringify(manifest)}\n`);
  const { manifestId, ...unsigned } = manifest;
  if (manifestId !== deliveryEvidenceManifestId(unsigned)) {
    throw new TypeError('delivery evidence manifest digest mismatch');
  }
  return true;
}

/** Mint the deterministic intent to release receipt chain for an admitted manifest. */
export async function buildDeliveryReceiptChain(
  manifest: DeliveryEvidenceManifest,
  start: HLCValue,
): Promise<readonly ReceiptEnvelope[]> {
  verifyDeliveryEvidenceManifest(manifest);
  const payloads = [
    ['delivery-intent', { intentId: manifest.intent.id, headSha: manifest.headSha }],
    ['delivery-plan', { planId: manifest.plan.id, planDigest: manifest.plan.digest }],
    ['delivery-verification', { authorityId: manifest.authority.id, evidence: manifest.evidence }],
    ['delivery-artifact', { metrics: manifest.metrics, governedExceptions: manifest.governedExceptions }],
    ['delivery-policy', { event: manifest.event, github: manifest.github }],
    ['delivery-release', { manifestId: manifest.manifestId, verdict: manifest.verdict }],
  ] as const;
  let timestamp = start;
  const entries = [];
  for (const [kind, payload] of payloads) {
    timestamp = HLC.increment(timestamp, timestamp.wall_ms);
    entries.push({
      kind,
      subject: { type: 'run' as const, id: `delivery:${manifest.headSha}` },
      payload: await TypedRef.create(`liteship/${kind}/v2`, payload),
      timestamp,
    });
  }
  const chain = await Receipt.buildChain(entries);
  await Receipt.validateChain(chain);
  const dag = DAG.fromReceipts(chain);
  if (dag.nodes.size !== chain.length || DAG.linearize(dag).length !== chain.length) {
    throw new TypeError('delivery receipt DAG did not retain every evidence stage');
  }
  return chain;
}

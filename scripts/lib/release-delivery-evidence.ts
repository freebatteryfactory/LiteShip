/** Independent frozen-bundle validation used before release and publish. @module */

import { DAG, Receipt, type ReceiptEnvelope } from '@liteship/core';
import { parseAffectedTestPlan } from './affected-test-plan.js';
import {
  DELIVERY_RECEIPT_KINDS,
  parseDeliveryAdmissionReceipt,
  type DeliveryReceiptChainFile,
} from './delivery-admission-receipt.js';
import {
  deliveryEvidenceManifestId,
  parseDeliveryEvidenceManifest,
  sha256RawBytes,
  type DeliveryEvidenceGithubIdentity,
} from './delivery-evidence-schema.js';

export interface VerifyReleaseDeliveryEvidenceInput {
  readonly planBytes: string | Uint8Array;
  readonly manifestBytes: string | Uint8Array;
  readonly receiptBytes: string | Uint8Array;
  readonly chainBytes: string | Uint8Array;
  readonly expected: DeliveryEvidenceGithubIdentity & { readonly headSha: string };
}

function parseJson(raw: string | Uint8Array, label: string): unknown {
  try {
    return JSON.parse(typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')) as unknown;
  } catch {
    throw new TypeError(`${label} is not valid JSON`);
  }
}

function exactKeys(value: object, expected: readonly string[], label: string): void {
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    throw new TypeError(`${label} keys are invalid`);
  }
}

function parseChain(value: unknown): DeliveryReceiptChainFile {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('delivery receipt chain must be an object');
  }
  exactKeys(value, ['schemaVersion', 'manifestId', 'headSha', 'planId', 'receipts'], 'delivery receipt chain');
  const chain = value as Partial<DeliveryReceiptChainFile>;
  if (chain.schemaVersion !== 1 || !Array.isArray(chain.receipts) || chain.receipts.length !== 6) {
    throw new TypeError('delivery receipt chain envelope is invalid');
  }
  chain.receipts.forEach((receipt, index) => {
    if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt)) {
      throw new TypeError(`delivery receipt ${index} is invalid`);
    }
    if (receipt.kind !== DELIVERY_RECEIPT_KINDS[index])
      throw new TypeError(`delivery receipt ${index} kind is invalid`);
  });
  return chain as DeliveryReceiptChainFile;
}

/** Verify frozen evidence without trusting the release workflow's shell projections. */
export async function verifyReleaseDeliveryEvidence(input: VerifyReleaseDeliveryEvidenceInput): Promise<true> {
  const plan = parseAffectedTestPlan(parseJson(input.planBytes, 'affected plan'));
  const manifest = parseDeliveryEvidenceManifest(input.manifestBytes);
  const receipt = parseDeliveryAdmissionReceipt(parseJson(input.receiptBytes, 'delivery admission receipt'));
  const chain = parseChain(parseJson(input.chainBytes, 'delivery receipt chain'));
  const { manifestId, ...unsignedManifest } = manifest;
  if (manifestId !== deliveryEvidenceManifestId(unsignedManifest))
    throw new TypeError('delivery manifest identity mismatch');
  if (manifest.plan.id !== plan.planId || manifest.plan.digest !== sha256RawBytes(input.planBytes)) {
    throw new TypeError('delivery manifest is foreign to affected plan bytes');
  }
  if (plan.headSha !== input.expected.headSha || manifest.headSha !== input.expected.headSha) {
    throw new TypeError('delivery source SHA is foreign');
  }
  for (const key of ['repository', 'workflow', 'runId', 'runAttempt', 'ref'] as const) {
    if (manifest.github[key] !== input.expected[key] || receipt.github[key] !== input.expected[key]) {
      throw new TypeError(`delivery GitHub ${key} is foreign`);
    }
  }
  if (
    receipt.manifestId !== manifest.manifestId ||
    receipt.planId !== plan.planId ||
    receipt.headSha !== input.expected.headSha ||
    chain.manifestId !== manifest.manifestId ||
    chain.planId !== plan.planId ||
    chain.headSha !== input.expected.headSha ||
    receipt.receiptChain.digest !== sha256RawBytes(input.chainBytes)
  ) {
    throw new TypeError('delivery admission bindings are inconsistent');
  }
  await Receipt.validateChain(chain.receipts as readonly ReceiptEnvelope[]);
  const dag = DAG.fromReceipts(chain.receipts as readonly ReceiptEnvelope[]);
  const ordered = DAG.linearize(dag);
  if (dag.nodes.size !== 6 || ordered.length !== 6) throw new TypeError('delivery evidence DAG is incomplete');
  const stages = chain.receipts.map((entry) => ({ kind: entry.kind, receiptId: entry.hash }));
  if (JSON.stringify(stages) !== JSON.stringify(receipt.receiptChain.stages)) {
    throw new TypeError('delivery receipt stages do not match the admitted chain');
  }
  return true;
}

/** Addressed receipt proving standalone admission of one exact delivery manifest. @module */

import type { ReceiptEnvelope } from '@liteship/core';
import {
  semanticSha256,
  sha256RawBytes,
  type DeliveryEvidenceManifest,
  type Sha256Digest,
} from './delivery-evidence-schema.js';

export const DELIVERY_RECEIPT_KINDS = [
  'delivery-intent',
  'delivery-plan',
  'delivery-verification',
  'delivery-artifact',
  'delivery-policy',
  'delivery-release',
] as const;

export interface DeliveryReceiptChainFile {
  readonly schemaVersion: 1;
  readonly manifestId: Sha256Digest;
  readonly headSha: string;
  readonly planId: Sha256Digest;
  readonly receipts: readonly ReceiptEnvelope[];
}

export interface DeliveryAdmissionReceiptUnsigned {
  readonly schemaVersion: 1;
  readonly verdict: 'accepted';
  readonly manifestId: Sha256Digest;
  readonly planId: Sha256Digest;
  readonly headSha: string;
  readonly github: DeliveryEvidenceManifest['github'];
  readonly verifier: 'delivery-evidence/standalone-v2';
  readonly admittedAt: string;
  readonly receiptChain: {
    readonly path: 'reports/delivery-receipt-chain.json';
    readonly digest: Sha256Digest;
    readonly stages: readonly {
      readonly kind: (typeof DELIVERY_RECEIPT_KINDS)[number];
      readonly receiptId: string;
    }[];
  };
}

export interface DeliveryAdmissionReceipt extends DeliveryAdmissionReceiptUnsigned {
  readonly receiptId: Sha256Digest;
}

function exactKeys(value: object, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new TypeError(`${label} keys are invalid`);
}

function validDate(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function sha256(value: unknown, label: string): asserts value is Sha256Digest {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError(`${label} must be a SHA-256 digest`);
  }
}

/** Serialize the six already-validated receipt envelopes in one bound chain file. */
export function buildDeliveryReceiptChainFile(
  manifest: DeliveryEvidenceManifest,
  receipts: readonly ReceiptEnvelope[],
): DeliveryReceiptChainFile {
  if (receipts.length !== DELIVERY_RECEIPT_KINDS.length)
    throw new TypeError('delivery receipt chain must have six stages');
  receipts.forEach((receipt, index) => {
    if (receipt.kind !== DELIVERY_RECEIPT_KINDS[index])
      throw new TypeError(`delivery receipt stage ${index} is invalid`);
  });
  return Object.freeze({
    schemaVersion: 1,
    manifestId: manifest.manifestId,
    headSha: manifest.headSha,
    planId: manifest.plan.id,
    receipts: Object.freeze([...receipts]),
  });
}

export function serializeDeliveryReceiptChainFile(chain: DeliveryReceiptChainFile): string {
  return `${JSON.stringify(chain, null, 2)}\n`;
}

/** Mint only after the standalone verifier and receipt-chain validator both pass. */
export function buildDeliveryAdmissionReceipt(input: {
  readonly manifest: DeliveryEvidenceManifest;
  readonly chain: DeliveryReceiptChainFile;
  readonly rawChainBytes: string | Uint8Array;
  readonly admittedAt: string;
}): DeliveryAdmissionReceipt {
  if (!validDate(input.admittedAt)) throw new TypeError('delivery admission timestamp is invalid');
  if (
    input.chain.manifestId !== input.manifest.manifestId ||
    input.chain.headSha !== input.manifest.headSha ||
    input.chain.planId !== input.manifest.plan.id
  ) {
    throw new TypeError('delivery receipt chain is foreign to the admitted manifest');
  }
  const stages = Object.freeze(
    input.chain.receipts.map((receipt, index) => {
      if (receipt.kind !== DELIVERY_RECEIPT_KINDS[index])
        throw new TypeError(`delivery receipt stage ${index} is invalid`);
      return Object.freeze({ kind: DELIVERY_RECEIPT_KINDS[index]!, receiptId: receipt.hash });
    }),
  );
  const unsigned: DeliveryAdmissionReceiptUnsigned = {
    schemaVersion: 1,
    verdict: 'accepted',
    manifestId: input.manifest.manifestId,
    planId: input.manifest.plan.id,
    headSha: input.manifest.headSha,
    github: Object.freeze({ ...input.manifest.github }),
    verifier: 'delivery-evidence/standalone-v2',
    admittedAt: input.admittedAt,
    receiptChain: Object.freeze({
      path: 'reports/delivery-receipt-chain.json',
      digest: sha256RawBytes(input.rawChainBytes),
      stages,
    }),
  };
  return Object.freeze({ ...unsigned, receiptId: semanticSha256(unsigned) });
}

/** Strict parser used by release admission before any subject is published. */
export function parseDeliveryAdmissionReceipt(value: unknown): DeliveryAdmissionReceipt {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('delivery admission receipt must be an object');
  }
  exactKeys(
    value,
    [
      'schemaVersion',
      'receiptId',
      'verdict',
      'manifestId',
      'planId',
      'headSha',
      'github',
      'verifier',
      'admittedAt',
      'receiptChain',
    ],
    'delivery admission receipt',
  );
  const receipt = value as Partial<DeliveryAdmissionReceipt>;
  if (
    receipt.schemaVersion !== 1 ||
    receipt.verdict !== 'accepted' ||
    receipt.verifier !== 'delivery-evidence/standalone-v2' ||
    typeof receipt.receiptId !== 'string' ||
    typeof receipt.manifestId !== 'string' ||
    typeof receipt.planId !== 'string' ||
    typeof receipt.headSha !== 'string' ||
    typeof receipt.admittedAt !== 'string' ||
    receipt.github === undefined ||
    receipt.receiptChain === undefined
  ) {
    throw new TypeError('delivery admission receipt envelope is invalid');
  }
  exactKeys(receipt.github, ['repository', 'workflow', 'runId', 'runAttempt', 'ref'], 'delivery admission github');
  exactKeys(receipt.receiptChain, ['path', 'digest', 'stages'], 'delivery admission receiptChain');
  sha256(receipt.receiptId, 'delivery admission receiptId');
  sha256(receipt.manifestId, 'delivery admission manifestId');
  sha256(receipt.planId, 'delivery admission planId');
  sha256(receipt.receiptChain.digest, 'delivery admission receipt-chain digest');
  if (!/^[0-9a-f]{40}$/u.test(receipt.headSha) || !validDate(receipt.admittedAt)) {
    throw new TypeError('delivery admission source identity or timestamp is invalid');
  }
  for (const key of ['repository', 'workflow', 'runId', 'runAttempt', 'ref'] as const) {
    const field = receipt.github[key];
    if (typeof field !== 'string' || field.length === 0 || field.trim() !== field) {
      throw new TypeError(`delivery admission github.${key} is invalid`);
    }
  }
  if (
    !/^[1-9][0-9]*$/u.test(receipt.github.runId) ||
    !/^[1-9][0-9]*$/u.test(receipt.github.runAttempt) ||
    !receipt.github.ref.startsWith('refs/') ||
    receipt.receiptChain.path !== 'reports/delivery-receipt-chain.json'
  ) {
    throw new TypeError('delivery admission GitHub or receipt-chain identity is invalid');
  }
  if (!Array.isArray(receipt.receiptChain.stages) || receipt.receiptChain.stages.length !== 6) {
    throw new TypeError('delivery admission receipt stages are invalid');
  }
  receipt.receiptChain.stages.forEach((stage, index) => {
    exactKeys(stage, ['kind', 'receiptId'], `delivery admission stage ${index}`);
    if (
      stage.kind !== DELIVERY_RECEIPT_KINDS[index] ||
      typeof stage.receiptId !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/u.test(stage.receiptId)
    ) {
      throw new TypeError(`delivery admission stage ${index} is invalid`);
    }
  });
  const { receiptId, ...unsigned } = receipt as DeliveryAdmissionReceipt;
  if (receiptId !== semanticSha256(unsigned)) throw new TypeError('delivery admission receipt identity mismatch');
  return Object.freeze(receipt as DeliveryAdmissionReceipt);
}

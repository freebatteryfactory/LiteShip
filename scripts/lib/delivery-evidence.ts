/** Evidence-native delivery manifest projected onto LiteShip receipts and the receipt DAG. @module */

import {
  AddressedDigest,
  canonicalAddressBytes,
  DAG,
  HLC,
  Receipt,
  TypedRef,
  type HLC as HLCValue,
  type IntegrityDigest,
  type ReceiptEnvelope,
} from '@liteship/core';
import type { CheckReport } from '@liteship/command';
import type { AffectedTestPlan } from './affected-test-plan.js';

export type DeliveryEvidenceKind =
  | 'check-report'
  | 'coverage'
  | 'benchmark'
  | 'sbom'
  | 'vex'
  | 'attestation'
  | 'delivery-metrics'
  | 'reproducibility'
  | 'standards'
  | 'consumer'
  | 'hermetic'
  | 'ship-capsule'
  | 'artifact';

export interface DeliveryEvidenceReference {
  readonly id: string;
  readonly kind: DeliveryEvidenceKind;
  readonly digest: IntegrityDigest;
  readonly producer: string;
  readonly path?: string;
}

export interface DeliveryBuilderIdentity {
  readonly workflow: string;
  readonly runId: string;
  readonly platform: string;
  readonly toolchain: string;
}

export interface DeliveryEvidenceManifest {
  readonly schemaVersion: 1;
  readonly manifestId: IntegrityDigest;
  readonly planId: AffectedTestPlan['planId'];
  readonly headSha: string;
  readonly builder: DeliveryBuilderIdentity;
  readonly requiredChecks: readonly string[];
  readonly checkResults: readonly {
    readonly id: string;
    readonly verdict: 'pass' | 'fail' | 'skipped';
    readonly cacheHit: boolean;
    readonly curePacketId?: string;
  }[];
  readonly evidence: readonly DeliveryEvidenceReference[];
  readonly curePacketIds: readonly string[];
  readonly residualUncertainty: readonly string[];
  readonly verdict: 'accepted' | 'rejected';
}

export interface DeliveryEvidenceInput {
  readonly plan: AffectedTestPlan;
  readonly builder: DeliveryBuilderIdentity;
  readonly reports: readonly CheckReport[];
  readonly evidence: readonly DeliveryEvidenceReference[];
}

type UnsignedManifest = Omit<DeliveryEvidenceManifest, 'manifestId'>;

function manifestDigest(value: UnsignedManifest): IntegrityDigest {
  return AddressedDigest.of(canonicalAddressBytes(value), 'sha256').integrity_digest;
}

function duplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

/** Build one deterministic manifest; missing/failed required evidence makes rejection explicit. */
export function buildDeliveryEvidenceManifest(input: DeliveryEvidenceInput): DeliveryEvidenceManifest {
  const checkResults = input.reports
    .flatMap((report) => report.results)
    .map((result) => ({
      id: result.id,
      verdict: result.verdict,
      cacheHit: result.cacheHit,
      ...(result.curePacketId === undefined ? {} : { curePacketId: result.curePacketId }),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const resultIds = checkResults.map((result) => result.id);
  const evidence = [...input.evidence].sort((a, b) => a.id.localeCompare(b.id));
  const uncertainty: string[] = [];
  const duplicateCheck = duplicate(resultIds);
  if (duplicateCheck !== undefined) throw new TypeError(`duplicate check result: ${duplicateCheck}`);
  const duplicateEvidence = duplicate(evidence.map((entry) => entry.id));
  if (duplicateEvidence !== undefined) throw new TypeError(`duplicate evidence reference: ${duplicateEvidence}`);
  for (const entry of evidence) {
    if (!/^(?:sha256|blake3):[0-9a-f]{64}$/u.test(entry.digest)) {
      throw new TypeError(`invalid evidence digest: ${entry.id}`);
    }
  }
  for (const required of input.plan.requiredChecks) {
    const result = checkResults.find((entry) => entry.id === required);
    if (result === undefined) uncertainty.push(`missing required check: ${required}`);
    else if (result.verdict !== 'pass') uncertainty.push(`required check ${required} is ${result.verdict}`);
  }
  if (input.plan.confidence === 'low') uncertainty.push('affected selector confidence is low');
  const curePacketIds = [
    ...new Set(input.reports.flatMap((report) => report.curePackets.map((packet) => packet.packetId))),
  ].sort();
  const unsigned: UnsignedManifest = {
    schemaVersion: 1,
    planId: input.plan.planId,
    headSha: input.plan.headSha,
    builder: input.builder,
    requiredChecks: input.plan.requiredChecks,
    checkResults,
    evidence,
    curePacketIds,
    residualUncertainty: uncertainty.sort(),
    verdict: uncertainty.length === 0 ? 'accepted' : 'rejected',
  };
  return { ...unsigned, manifestId: manifestDigest(unsigned) };
}

/** Independently verify manifest identity, closure, and verdict consistency. */
export function verifyDeliveryEvidenceManifest(manifest: DeliveryEvidenceManifest): true {
  const { manifestId, ...unsigned } = manifest;
  if (manifestId !== manifestDigest(unsigned)) throw new TypeError('delivery evidence manifest digest mismatch');
  const duplicateCheck = duplicate(manifest.checkResults.map((entry) => entry.id));
  if (duplicateCheck !== undefined) throw new TypeError(`duplicate check result: ${duplicateCheck}`);
  const duplicateEvidence = duplicate(manifest.evidence.map((entry) => entry.id));
  if (duplicateEvidence !== undefined) throw new TypeError(`duplicate evidence reference: ${duplicateEvidence}`);
  for (const evidence of manifest.evidence) {
    if (!/^(?:sha256|blake3):[0-9a-f]{64}$/u.test(evidence.digest)) {
      throw new TypeError(`invalid evidence digest: ${evidence.id}`);
    }
  }
  const missingOrBad = manifest.requiredChecks.filter(
    (id) => manifest.checkResults.find((entry) => entry.id === id)?.verdict !== 'pass',
  );
  const shouldAccept = missingOrBad.length === 0 && manifest.residualUncertainty.length === 0;
  if ((manifest.verdict === 'accepted') !== shouldAccept)
    throw new TypeError('delivery evidence verdict is inconsistent');
  return true;
}

/** Mint a deterministic intent→plan→verification→artifact→policy→release receipt chain. */
export async function buildDeliveryReceiptChain(
  manifest: DeliveryEvidenceManifest,
  start: HLCValue,
): Promise<readonly ReceiptEnvelope[]> {
  verifyDeliveryEvidenceManifest(manifest);
  const payloads = [
    ['delivery-intent', { headSha: manifest.headSha, requiredChecks: manifest.requiredChecks }],
    ['delivery-plan', { planId: manifest.planId, builder: manifest.builder }],
    ['delivery-verification', { results: manifest.checkResults, curePacketIds: manifest.curePacketIds }],
    ['delivery-artifact', { evidence: manifest.evidence }],
    ['delivery-policy', { residualUncertainty: manifest.residualUncertainty }],
    ['delivery-release', { manifestId: manifest.manifestId, verdict: manifest.verdict }],
  ] as const;
  let timestamp = start;
  const entries = [];
  for (const [kind, payload] of payloads) {
    timestamp = HLC.increment(timestamp, timestamp.wall_ms);
    entries.push({
      kind,
      subject: { type: 'run' as const, id: `delivery:${manifest.headSha}` },
      payload: await TypedRef.create(`liteship/${kind}/v1`, payload),
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

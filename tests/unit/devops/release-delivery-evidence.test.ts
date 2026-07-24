import { afterEach, describe, expect, it } from 'vitest';
import { HLC } from '@liteship/core';
import {
  buildDeliveryAdmissionReceipt,
  buildDeliveryReceiptChainFile,
  serializeDeliveryReceiptChainFile,
} from '../../../scripts/lib/delivery-admission-receipt.js';
import { buildDeliveryReceiptChain } from '../../../scripts/lib/delivery-evidence.js';
import { verifyReleaseDeliveryEvidence } from '../../../scripts/lib/release-delivery-evidence.js';
import {
  createDeliveryEvidenceFixture,
  removeDeliveryEvidenceFixture,
  type DeliveryEvidenceFixture,
} from '../../support/delivery-evidence-fixture.js';

const fixtures: DeliveryEvidenceFixture[] = [];
afterEach(() => fixtures.splice(0).forEach(removeDeliveryEvidenceFixture));

async function subject() {
  const fixture = createDeliveryEvidenceFixture();
  fixtures.push(fixture);
  const receipts = await buildDeliveryReceiptChain(
    fixture.manifest,
    HLC.increment(HLC.create('delivery-admission'), 1_000),
  );
  const chain = buildDeliveryReceiptChainFile(fixture.manifest, receipts);
  const chainBytes = serializeDeliveryReceiptChainFile(chain);
  const receipt = buildDeliveryAdmissionReceipt({
    manifest: fixture.manifest,
    chain,
    rawChainBytes: chainBytes,
    admittedAt: '2026-07-24T14:00:00.000Z',
  });
  return {
    fixture,
    input: {
      planBytes: fixture.planBytes,
      manifestBytes: `${JSON.stringify(fixture.manifest, null, 2)}\n`,
      receiptBytes: `${JSON.stringify(receipt, null, 2)}\n`,
      chainBytes,
      expected: {
        headSha: fixture.expected.headSha,
        repository: fixture.expected.repository,
        workflow: fixture.expected.workflow,
        runId: fixture.expected.runId,
        runAttempt: fixture.expected.runAttempt,
        ref: fixture.expected.ref,
      },
    },
  };
}

describe('release delivery evidence verification', () => {
  it('independently verifies manifest, receipt, raw chain, and receipt DAG', async () => {
    const value = await subject();
    await expect(verifyReleaseDeliveryEvidence(value.input)).resolves.toBe(true);
  });

  it('rejects altered source, raw chain, and admission receipt', async () => {
    const value = await subject();
    await expect(
      verifyReleaseDeliveryEvidence({ ...value.input, expected: { ...value.input.expected, headSha: 'c'.repeat(40) } }),
    ).rejects.toThrow(/source SHA/u);
    await expect(
      verifyReleaseDeliveryEvidence({ ...value.input, chainBytes: `${value.input.chainBytes} ` }),
    ).rejects.toThrow(/bindings/u);
    const receipt = JSON.parse(value.input.receiptBytes) as Record<string, unknown>;
    await expect(
      verifyReleaseDeliveryEvidence({
        ...value.input,
        receiptBytes: `${JSON.stringify({ ...receipt, headSha: 'd'.repeat(40) })}\n`,
      }),
    ).rejects.toThrow(/identity/u);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { HLC } from '@liteship/core';
import {
  buildDeliveryAdmissionReceipt,
  buildDeliveryReceiptChainFile,
  parseDeliveryAdmissionReceipt,
  serializeDeliveryReceiptChainFile,
} from '../../../scripts/lib/delivery-admission-receipt.js';
import { buildDeliveryReceiptChain } from '../../../scripts/lib/delivery-evidence.js';
import {
  createDeliveryEvidenceFixture,
  removeDeliveryEvidenceFixture,
  type DeliveryEvidenceFixture,
} from '../../support/delivery-evidence-fixture.js';

const fixtures: DeliveryEvidenceFixture[] = [];
afterEach(() => fixtures.splice(0).forEach(removeDeliveryEvidenceFixture));

describe('delivery admission receipt', () => {
  it('binds the admitted manifest to the exact six-stage receipt chain', async () => {
    const fixture = createDeliveryEvidenceFixture();
    fixtures.push(fixture);
    const receipts = await buildDeliveryReceiptChain(
      fixture.manifest,
      HLC.increment(HLC.create('delivery-admission'), 1_000),
    );
    const chain = buildDeliveryReceiptChainFile(fixture.manifest, receipts);
    const raw = serializeDeliveryReceiptChainFile(chain);
    const receipt = buildDeliveryAdmissionReceipt({
      manifest: fixture.manifest,
      chain,
      rawChainBytes: raw,
      admittedAt: '2026-07-24T14:00:00.000Z',
    });
    expect(parseDeliveryAdmissionReceipt(JSON.parse(JSON.stringify(receipt)))).toEqual(receipt);
    expect(receipt.receiptChain.stages.map((stage) => stage.kind)).toEqual(receipts.map((entry) => entry.kind));
  });

  it('rejects foreign chains and altered receipt fields', async () => {
    const fixture = createDeliveryEvidenceFixture();
    fixtures.push(fixture);
    const receipts = await buildDeliveryReceiptChain(
      fixture.manifest,
      HLC.increment(HLC.create('delivery-admission'), 1_000),
    );
    const chain = buildDeliveryReceiptChainFile(fixture.manifest, receipts);
    expect(() =>
      buildDeliveryAdmissionReceipt({
        manifest: fixture.manifest,
        chain: { ...chain, headSha: 'c'.repeat(40) },
        rawChainBytes: serializeDeliveryReceiptChainFile(chain),
        admittedAt: '2026-07-24T14:00:00.000Z',
      }),
    ).toThrow(/foreign/u);
    const receipt = buildDeliveryAdmissionReceipt({
      manifest: fixture.manifest,
      chain,
      rawChainBytes: serializeDeliveryReceiptChainFile(chain),
      admittedAt: '2026-07-24T14:00:00.000Z',
    });
    expect(() => parseDeliveryAdmissionReceipt({ ...receipt, headSha: 'd'.repeat(40) })).toThrow(/identity/u);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HLC, Receipt } from '@liteship/core';
import {
  buildDeliveryEvidenceManifest,
  buildDeliveryReceiptChain,
  verifyDeliveryEvidenceManifest,
  type DeliveryEvidenceBuilderInput,
} from '../../../scripts/lib/delivery-evidence.js';
import {
  createDeliveryEvidenceFixture,
  removeDeliveryEvidenceFixture,
  type DeliveryEvidenceFixture,
} from '../../support/delivery-evidence-fixture.js';

const fixtures: DeliveryEvidenceFixture[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) removeDeliveryEvidenceFixture(fixture);
});

function input(fixture: DeliveryEvidenceFixture): DeliveryEvidenceBuilderInput {
  const read = (path: string): Buffer => readFileSync(join(fixture.root, ...path.split('/')));
  return {
    event: fixture.expected.event,
    headSha: fixture.expected.headSha,
    github: {
      repository: fixture.expected.repository,
      workflow: fixture.expected.workflow,
      runId: fixture.expected.runId,
      runAttempt: fixture.expected.runAttempt,
      ref: fixture.expected.ref,
    },
    planBytes: fixture.planBytes,
    intentBytes: read('reports/change-intent.json'),
    authorityBytes: read('reports/ci-authority.json'),
    governedExceptionsBytes: read('reports/governed-exceptions.json'),
    checkEvidenceBytes: new Map(
      fixture.selected.map((selection) => [selection.requirement.path, read(selection.requirement.path)]),
    ),
    metricsBytes: read('reports/delivery-metrics.json'),
  };
}

describe('delivery evidence manifest builder', () => {
  it('projects exact raw evidence and all six stages onto a valid receipt chain', async () => {
    const fixture = createDeliveryEvidenceFixture();
    fixtures.push(fixture);
    const manifest = buildDeliveryEvidenceManifest(input(fixture));
    expect(manifest).toEqual(fixture.manifest);
    expect(verifyDeliveryEvidenceManifest(manifest)).toBe(true);
    const chain = await buildDeliveryReceiptChain(manifest, HLC.increment(HLC.create('builder'), 1_000));
    expect(chain.map((entry) => entry.kind)).toEqual([
      'delivery-intent',
      'delivery-plan',
      'delivery-verification',
      'delivery-artifact',
      'delivery-policy',
      'delivery-release',
    ]);
    await expect(Receipt.validateChain(chain)).resolves.toBe(true);
  });

  it('refuses absent selected evidence rather than minting an incomplete candidate', () => {
    const fixture = createDeliveryEvidenceFixture();
    fixtures.push(fixture);
    const candidate = input(fixture);
    const missing = new Map(candidate.checkEvidenceBytes);
    missing.delete(fixture.selected[0]!.requirement.path);
    expect(() => buildDeliveryEvidenceManifest({ ...candidate, checkEvidenceBytes: missing })).toThrow(
      /missing raw evidence/u,
    );
  });

  it('binds raw-byte changes and rejects structural tampering', () => {
    const fixture = createDeliveryEvidenceFixture();
    fixtures.push(fixture);
    const candidate = input(fixture);
    const manifest = buildDeliveryEvidenceManifest(candidate);
    const changed = buildDeliveryEvidenceManifest({
      ...candidate,
      governedExceptionsBytes: '[ ]\n',
    });
    expect(changed.governedExceptions?.digest).not.toBe(manifest.governedExceptions?.digest);
    expect(() => verifyDeliveryEvidenceManifest({ ...manifest, headSha: 'c'.repeat(40) })).toThrow(/digest/u);
  });
});

import { describe, expect, it } from 'vitest';
import { AddressedDigest, canonicalAddressBytes, HLC, Receipt } from '@liteship/core';
import type { CheckReport } from '@liteship/command';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import {
  buildDeliveryEvidenceManifest,
  buildDeliveryReceiptChain,
  verifyDeliveryEvidenceManifest,
} from '../../../scripts/lib/delivery-evidence.js';

const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, buildAssuranceInventory(process.cwd()), {
  baseRef: 'origin/main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  confidence: 'high',
  selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
});

function report(overrides: Partial<CheckReport> = {}): CheckReport {
  return {
    profile: 'quick',
    platform: 'linux',
    context: 'repository',
    ok: true,
    blocked: false,
    results: plan.requiredChecks.map((id) => ({ id, verdict: 'pass', durationMs: 1, cacheHit: false, findings: [] })),
    curePackets: [],
    ...overrides,
  };
}

const evidence = [
  {
    id: 'coverage',
    kind: 'coverage' as const,
    digest: AddressedDigest.of(canonicalAddressBytes({ lines: 100 })).integrity_digest,
    producer: 'check/coverage',
    path: 'coverage/coverage-final.json',
  },
];

describe('delivery evidence manifest', () => {
  it('addresses an accepted manifest and projects all six stages onto a valid receipt chain', async () => {
    const manifest = buildDeliveryEvidenceManifest({
      plan,
      builder: { workflow: 'ci', runId: 'run-1', platform: 'linux', toolchain: 'node-22' },
      reports: [report()],
      evidence,
    });
    expect(manifest.verdict).toBe('accepted');
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

  it('rejects missing and skipped required evidence instead of minting a false green', () => {
    const results = report()
      .results.slice(1)
      .map((result, index) => (index === 0 ? { ...result, verdict: 'skipped' as const } : result));
    const manifest = buildDeliveryEvidenceManifest({
      plan,
      builder: { workflow: 'ci', runId: 'run-2', platform: 'linux', toolchain: 'node-22' },
      reports: [report({ results })],
      evidence,
    });
    expect(manifest.verdict).toBe('rejected');
    expect(manifest.residualUncertainty.some((entry) => /missing required check|is skipped/u.test(entry))).toBe(true);
  });

  it('detects stale, duplicate, and foreign evidence rather than trusting labels', () => {
    const manifest = buildDeliveryEvidenceManifest({
      plan,
      builder: { workflow: 'ci', runId: 'run-3', platform: 'linux', toolchain: 'node-22' },
      reports: [report()],
      evidence,
    });
    expect(() => verifyDeliveryEvidenceManifest({ ...manifest, headSha: 'c'.repeat(40) })).toThrow(/digest/u);
    expect(() =>
      buildDeliveryEvidenceManifest({
        plan,
        builder: { workflow: 'ci', runId: 'run-4', platform: 'linux', toolchain: 'node-22' },
        reports: [report(), report()],
        evidence: [...evidence, evidence[0]!],
      }),
    ).toThrow(/duplicate/u);
    expect(() =>
      verifyDeliveryEvidenceManifest({
        ...manifest,
        evidence: [{ ...evidence[0]!, digest: 'sha256:not-a-digest' as never }],
      }),
    ).toThrow();
  });
});

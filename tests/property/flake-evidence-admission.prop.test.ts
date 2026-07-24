/**
 * Model-based flake evidence admission.
 *
 * These properties protect the evidence authority itself: a record is useful
 * only when its identity, checkout, target contract, counts, rate, expiry, and
 * retry history all agree. No property below merely restates an implementation
 * branch; each compares the implementation with an independent small model or
 * with a boundary mutation that must fail closed.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { IntegrityDigest } from '@liteship/core';
import { createCurePacket } from '../../packages/cli/src/lib/cure-packet.js';
import {
  assertFlakeEvidenceCurrent,
  buildFlakeEvidence,
  parseFlakeEvidence,
  type FlakeAttemptObservation,
  type FlakeEvidence,
} from '../../scripts/lib/flake-evidence.js';
import { buildDeliveryMetrics } from '../../scripts/lib/delivery-metrics.js';
import { planAffectedTests } from '../../scripts/lib/affected-test-plan.js';
import type { AssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import type { FlakeTarget } from '../../scripts/test-flake-targets.js';

const HEAD = 'a'.repeat(40);
const OTHER_HEAD = 'b'.repeat(40);
const OBSERVED_ON = '2026-07-24';
const EXPIRES = '2026-07-31';
const TODAY = '2026-07-25';

const emptyInventory: AssuranceInventory = {
  schemaVersion: 2,
  packages: [],
  totals: {
    sourceLoc: 0,
    authoredEvidenceLoc: 0,
    generatedEvidenceLoc: 0,
    corpusLoc: 0,
    ratioMilli: 0,
    targetMilli: 10_000,
    sourceRoles: { product: 0, verificationEngine: 0, rustWasm: 0, workflowAuthority: 0, generated: 0 },
  },
};

const plan = planAffectedTests(['README.md'], [], emptyInventory, {
  baseRef: 'origin/main',
  baseSha: 'c'.repeat(40),
  headSha: HEAD,
  confidence: 'high',
  selectorCalibrationId: `sha256:${'d'.repeat(64)}`,
});

const segmentArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/u);
const targetArb: fc.Arbitrary<FlakeTarget> = fc
  .tuple(segmentArb, fc.constantFrom<'node' | 'browser'>('node', 'browser'), segmentArb)
  .map(([name, kind, owner]) => ({
    path: `tests/${kind}/${name}.test.ts`,
    kind,
    owner: `packages/${owner}/src`,
    provingScar: `scar:${kind}:${name}`,
    remediation: `repair ${owner} and rerun ${name}`,
  }));

const scheduleArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 20 });
const failingScheduleArb = scheduleArb.filter((passes) => passes.some((pass) => !pass));

function observations(target: FlakeTarget, passes: readonly boolean[]): readonly FlakeAttemptObservation[] {
  return passes.map((pass, index) => ({
    target: target.path,
    iteration: index + 1,
    verdict: pass ? ('pass' as const) : ('fail' as const),
    exitCode: pass ? 0 : 1,
  }));
}

function evidence(
  target: FlakeTarget,
  passes: readonly boolean[],
  overrides: Partial<{
    firstSha: string;
    lastSha: string;
    observedOn: string;
    expires: string;
  }> = {},
): FlakeEvidence {
  return buildFlakeEvidence({
    targets: [target],
    observations: observations(target, passes),
    firstSha: overrides.firstSha ?? HEAD,
    lastSha: overrides.lastSha ?? HEAD,
    observedOn: overrides.observedOn ?? OBSERVED_ON,
    expires: overrides.expires ?? EXPIRES,
  });
}

function rotate<T>(values: readonly T[], distance: number): readonly T[] {
  const offset = distance % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function modelRecoveredRetries(passes: readonly boolean[]): number {
  const firstFailure = passes.findIndex((pass) => !pass);
  return firstFailure < 0 ? 0 : passes.slice(firstFailure + 1).filter(Boolean).length;
}

function deliveryInput(flakeEvidence: FlakeEvidence | null, knownFlakyReruns: number | null) {
  return {
    plan,
    reports: [],
    timings: { queueMs: 1, feedbackLatencyMs: 2, buildMs: 3, testMs: 4, totalComputeMs: 5 },
    jobAttempts: 1,
    reruns: 0,
    knownFlakyReruns,
    flakeAttempts: flakeEvidence?.attempts ?? null,
    requiredEvidence: 1,
    presentEvidence: 1,
    escapedDefects: 0,
    artifactMismatches: 0,
    selectorMisses: 0,
    flakeEvidenceId: flakeEvidence?.evidenceId ?? null,
  } as const;
}

describe('flake evidence model and admission properties', () => {
  it('matches an independent count, rate, recovery, and verdict model', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, (target, passes) => {
        const record = evidence(target, passes);
        const failures = passes.filter((pass) => !pass).length;
        expect(record.attempts).toBe(passes.length);
        expect(record.failures).toBe(failures);
        expect(record.observedFailureRate).toBe(failures / passes.length);
        expect(record.recoveredRetries).toBe(modelRecoveredRetries(passes));
        expect(record.verdict).toBe(failures === 0 ? 'pass' : 'fail');
        expect(record.targets[0]).toMatchObject({
          attempts: passes.length,
          failures,
          observedFailureRate: failures / passes.length,
        });
      }),
    );
  });

  it('keeps failure monotone under arbitrary rotations and reversal', () => {
    fc.assert(
      fc.property(targetArb, failingScheduleArb, fc.nat(), (target, passes, distance) => {
        const variants = [passes, rotate(passes, distance), [...passes].reverse()];
        const records = variants.map((variant) => evidence(target, variant));
        for (const record of records) {
          expect(record.verdict).toBe('fail');
          expect(record.failures).toBe(passes.filter((pass) => !pass).length);
          expect(record.observedFailureRate).toBe(record.failures / record.attempts);
        }
      }),
    );
  });

  it('round-trips serialized records without changing identity or evidence', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, (target, passes) => {
        const original = evidence(target, passes);
        const decoded = parseFlakeEvidence(JSON.parse(JSON.stringify(original)) as unknown);
        expect(decoded).toEqual(original);
        expect(decoded.evidenceId).toBe(original.evidenceId);
      }),
    );
  });

  it('rejects arbitrary envelope, identity, count, rate, verdict, and observation doctoring', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, fc.integer({ min: 1, max: 100 }), (target, passes, delta) => {
        const valid = evidence(target, passes);
        const firstTarget = valid.targets[0]!;
        const firstObservation = firstTarget.observations[0]!;
        const mutations: readonly unknown[] = [
          { ...valid, foreign: true },
          { ...valid, evidenceId: `sha256:${'0'.repeat(64)}` },
          { ...valid, attempts: valid.attempts + delta },
          { ...valid, failures: valid.failures + delta },
          { ...valid, recoveredRetries: valid.recoveredRetries + delta },
          { ...valid, observedFailureRate: valid.observedFailureRate + delta / 100 },
          { ...valid, verdict: valid.verdict === 'pass' ? 'fail' : 'pass' },
          { ...valid, targets: [{ ...firstTarget, failures: firstTarget.failures + delta }] },
          { ...valid, targets: [{ ...firstTarget, owner: '' }] },
          {
            ...valid,
            targets: [
              {
                ...firstTarget,
                observations: [{ ...firstObservation, iteration: firstObservation.iteration + delta }],
              },
            ],
          },
          {
            ...valid,
            targets: [
              {
                ...firstTarget,
                observations: [
                  {
                    ...firstObservation,
                    verdict: firstObservation.verdict === 'pass' ? 'fail' : 'pass',
                  },
                ],
              },
            ],
          },
        ];
        for (const mutation of mutations) expect(() => parseFlakeEvidence(mutation)).toThrow();
      }),
    );
  });

  it('binds admission to both checkout identities and the current target contract', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, (target, passes) => {
        const valid = evidence(target, passes);
        expect(() =>
          assertFlakeEvidenceCurrent(valid, { headSha: HEAD, targets: [target], today: TODAY }),
        ).not.toThrow();
        expect(() =>
          assertFlakeEvidenceCurrent(valid, { headSha: OTHER_HEAD, targets: [target], today: TODAY }),
        ).toThrow(/foreign checkout/u);
        expect(() =>
          assertFlakeEvidenceCurrent(valid, {
            headSha: HEAD,
            targets: [{ ...target, provingScar: `${target.provingScar}:changed` }],
            today: TODAY,
          }),
        ).toThrow(/stale/u);
      }),
    );
  });

  it('rejects records when either observed SHA moved during the campaign', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, fc.boolean(), (target, passes, moveBefore) => {
        const moved = evidence(target, passes, moveBefore ? { firstSha: OTHER_HEAD } : { lastSha: OTHER_HEAD });
        expect(moved.verdict).toBe('fail');
        expect(() => assertFlakeEvidenceCurrent(moved, { headSha: HEAD, targets: [target], today: TODAY })).toThrow(
          /foreign checkout/u,
        );
      }),
    );
  });

  it('rejects expired records at the injected wall-clock boundary', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, (target, passes) => {
        const valid = evidence(target, passes);
        expect(() =>
          assertFlakeEvidenceCurrent(valid, { headSha: HEAD, targets: [target], today: EXPIRES }),
        ).not.toThrow();
        expect(() =>
          assertFlakeEvidenceCurrent(valid, { headSha: HEAD, targets: [target], today: '2026-08-01' }),
        ).toThrow(/expired/u);
      }),
    );
  });

  it('rejects duplicate targets rather than double-counting their observations', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, (target, passes) => {
        expect(() =>
          buildFlakeEvidence({
            targets: [target, { ...target }],
            observations: observations(target, passes),
            firstSha: HEAD,
            lastSha: HEAD,
            observedOn: OBSERVED_ON,
            expires: EXPIRES,
          }),
        ).toThrow(/unique/u);
      }),
    );
  });

  it('requires an admitted evidence identity for every claimed flake count', () => {
    fc.assert(
      fc.property(targetArb, scheduleArb, (target, passes) => {
        const valid = evidence(target, passes);
        const admitted = buildDeliveryMetrics(deliveryInput(valid, valid.recoveredRetries));
        expect(admitted.evidenceSources.flakeEvidenceId).toBe(valid.evidenceId);
        expect(() => buildDeliveryMetrics(deliveryInput(null, valid.recoveredRetries))).toThrow(/supplied together/u);
        expect(() =>
          buildDeliveryMetrics({
            ...deliveryInput(valid, valid.attempts + 1),
          }),
        ).toThrow(/exceed/u);
      }),
    );
  });

  it('re-addresses delivery metrics when the admitted flake evidence changes', () => {
    fc.assert(
      fc.property(targetArb, failingScheduleArb, (target, passes) => {
        const first = evidence(target, passes);
        const second = evidence(target, [...passes, true]);
        const firstMetrics = buildDeliveryMetrics(deliveryInput(first, first.recoveredRetries));
        const secondMetrics = buildDeliveryMetrics(deliveryInput(second, second.recoveredRetries));
        expect(second.evidenceId).not.toBe(first.evidenceId);
        expect(secondMetrics.metricsId).not.toBe(firstMetrics.metricsId);
      }),
    );
  });

  it('preserves the proving scar and exact reproducer in CurePacket identity', () => {
    fc.assert(
      fc.property(targetArb, (target) => {
        const record = evidence(target, [false, true]);
        const targetEvidence = record.targets[0]!;
        const command = targetEvidence.reproducer.join(' ');
        const packet = createCurePacket({
          headSha: HEAD,
          treeDigest: IntegrityDigest(`sha256:${'e'.repeat(64)}`),
          checkId: 'check/test-flake',
          title: 'Flake detector',
          claim: 'Repeated runs remain deterministic.',
          owner: targetEvidence.owner,
          remediation: targetEvidence.remediation,
          command,
          findings: [targetEvidence.provingScar],
          profile: 'release',
          lane: 'profile:release',
          platform: targetEvidence.kind === 'browser' ? 'browser' : 'linux',
          toolchain: 'node=22;pnpm=10',
          invariantIds: [targetEvidence.provingScar],
        });
        expect(packet.contract.invariantIds).toEqual([targetEvidence.provingScar]);
        expect(packet.reproducer.command).toEqual([command]);
        expect(packet.observation.actual).toContain(targetEvidence.provingScar);
        expect(packet.prompt).toContain(targetEvidence.provingScar);
        expect(packet.prompt).toContain(command);

        const changedScar = createCurePacket({
          headSha: HEAD,
          treeDigest: IntegrityDigest(`sha256:${'e'.repeat(64)}`),
          checkId: 'check/test-flake',
          title: 'Flake detector',
          claim: 'Repeated runs remain deterministic.',
          owner: targetEvidence.owner,
          remediation: targetEvidence.remediation,
          command,
          findings: [`${targetEvidence.provingScar}:changed`],
          profile: 'release',
          lane: 'profile:release',
          platform: targetEvidence.kind === 'browser' ? 'browser' : 'linux',
          toolchain: 'node=22;pnpm=10',
          invariantIds: [`${targetEvidence.provingScar}:changed`],
        });
        expect(changedScar.packetId).not.toBe(packet.packetId);

        const changedReproducer = createCurePacket({
          headSha: HEAD,
          treeDigest: IntegrityDigest(`sha256:${'e'.repeat(64)}`),
          checkId: 'check/test-flake',
          title: 'Flake detector',
          claim: 'Repeated runs remain deterministic.',
          owner: targetEvidence.owner,
          remediation: targetEvidence.remediation,
          command: `${command} --changed`,
          findings: [targetEvidence.provingScar],
          profile: 'release',
          lane: 'profile:release',
          platform: targetEvidence.kind === 'browser' ? 'browser' : 'linux',
          toolchain: 'node=22;pnpm=10',
          invariantIds: [targetEvidence.provingScar],
        });
        expect(changedReproducer.packetId).not.toBe(packet.packetId);
      }),
    );
  });
});

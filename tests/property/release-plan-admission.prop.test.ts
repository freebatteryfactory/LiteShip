import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { planAffectedTests } from '../../scripts/lib/affected-test-plan.js';
import { admitReleasePlanBinding } from '../../scripts/lib/release-plan-admission.js';
import type { AssuranceInventory } from '../../scripts/lib/assurance-inventory.js';

const HEAD = 'b'.repeat(40);
const inventory: AssuranceInventory = {
  schemaVersion: 2,
  packages: PACKAGE_CATALOG.map((record) => ({
    name: record.name,
    sourceLoc: 1,
    authoredEvidenceLoc: 1,
    generatedEvidenceLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    targetReached: false,
    highestAssurance: 'L1',
    evidenceRequirements: ['unit'],
    missingEvidence: [],
    evidenceClasses: {
      unit: 1,
      property: 0,
      component: 0,
      integration: 0,
      regression: 0,
      browser: 0,
      e2e: 0,
      fuzz: 0,
      simulation: 0,
      mutation: 0,
      mcdc: 0,
      chaos: 0,
      benchmark: 0,
    },
    evidenceFiles: [],
  })),
  totals: {
    sourceLoc: 25,
    authoredEvidenceLoc: 25,
    generatedEvidenceLoc: 0,
    corpusLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    sourceRoles: { product: 25, verificationEngine: 0, rustWasm: 0, workflowAuthority: 0, generated: 0 },
  },
};
const PLAN = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory, {
  baseRef: 'origin/main',
  baseSha: 'a'.repeat(40),
  headSha: HEAD,
  confidence: 'high',
  selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
});
const hex = (length: number): fc.Arbitrary<string> =>
  fc
    .array(fc.constantFrom(...'0123456789abcdef'), { minLength: length, maxLength: length })
    .map((digits) => digits.join(''));

describe('release plan admission properties', () => {
  it('is invariant to binding key order', () => {
    const entries = [
      ['plan', PLAN],
      ['gitHead', HEAD],
      ['admittedPlanId', PLAN.planId],
    ] as const;
    fc.assert(
      fc.property(fc.shuffledSubarray(entries, { minLength: entries.length, maxLength: entries.length }), (order) => {
        expect(admitReleasePlanBinding(Object.fromEntries(order))).toEqual({
          sourceCommit: HEAD,
          planId: PLAN.planId,
        });
      }),
      { seed: 0xb1ad1, numRuns: 50 },
    );
  });

  it('rejects every generated foreign checkout head', () => {
    fc.assert(
      fc.property(hex(40), (foreignHead) => {
        fc.pre(foreignHead !== HEAD);
        expect(() =>
          admitReleasePlanBinding({ plan: PLAN, gitHead: foreignHead, admittedPlanId: PLAN.planId }),
        ).toThrow(/checkout HEAD/u);
      }),
      { seed: 0x4ead, numRuns: 80 },
    );
  });

  it('rejects every generated foreign admitted plan identity', () => {
    fc.assert(
      fc.property(hex(64), (foreignDigest) => {
        const foreignPlanId = `sha256:${foreignDigest}`;
        fc.pre(foreignPlanId !== PLAN.planId);
        expect(() => admitReleasePlanBinding({ plan: PLAN, gitHead: HEAD, admittedPlanId: foreignPlanId })).toThrow(
          /admitted plan/u,
        );
      }),
      { seed: 0xa6d17, numRuns: 80 },
    );
  });

  it('rejects arbitrary foreign binding fields', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^foreign_[a-z]{1,12}$/), fc.jsonValue(), (key, value) => {
        expect(() =>
          admitReleasePlanBinding({ plan: PLAN, gitHead: HEAD, admittedPlanId: PLAN.planId, [key]: value }),
        ).toThrow(/keys must be exactly/u);
      }),
      { seed: 0xf0e16, numRuns: 70 },
    );
  });

  it('rejects any post-address plan reason edit even when the binding IDs are unchanged', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,50}$/), (reason) => {
        fc.pre(reason !== PLAN.reason);
        expect(() =>
          admitReleasePlanBinding({
            plan: { ...PLAN, reason },
            gitHead: HEAD,
            admittedPlanId: PLAN.planId,
          }),
        ).toThrow(/integrity digest/u);
      }),
      { seed: 0x1a7e6, numRuns: 70 },
    );
  });
});

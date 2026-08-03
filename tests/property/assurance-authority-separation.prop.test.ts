/** Metamorphic laws for continuous density and isolated semantic admission. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import {
  assuranceRegressions,
  baselineFromInventory,
  type AssuranceInventory,
  type EvidenceClass,
  type PackageAssuranceInventory,
} from '../../scripts/lib/assurance-inventory.js';

const evidenceClasses: readonly EvidenceClass[] = [
  'unit',
  'property',
  'component',
  'integration',
  'regression',
  'browser',
  'e2e',
  'fuzz',
  'simulation',
  'mutation',
  'mcdc',
  'chaos',
  'benchmark',
];

function emptyEvidenceClasses(): Record<EvidenceClass, number> {
  return Object.fromEntries(evidenceClasses.map((kind) => [kind, 0])) as Record<EvidenceClass, number>;
}

function packageRow(name: string, missingEvidence: readonly string[] = []): PackageAssuranceInventory {
  return {
    name,
    sourceLoc: 100,
    authoredEvidenceLoc: 200,
    generatedEvidenceLoc: 0,
    ratioMilli: 2_000,
    targetMilli: 10_000,
    targetReached: false,
    highestAssurance: 'L4',
    evidenceRequirements: ['unit', 'property', 'mutation', 'mcdc'],
    missingEvidence,
    evidenceClasses: emptyEvidenceClasses(),
    evidenceFiles: [],
  };
}

function inventory(gaps: Readonly<Record<string, readonly string[]>> = {}, ratioMilli = 2_000): AssuranceInventory {
  return {
    schemaVersion: 4,
    packages: PACKAGE_CATALOG.map((record) => packageRow(record.name, gaps[record.name] ?? [])),
    evidenceOwnership: {
      packageFiles: [],
      repositoryTooling: { owner: 'repository/tooling', authoredEvidenceLoc: 0, generatedEvidenceLoc: 0, files: [] },
    },
    nodeTestSelection: { entrypoints: [], dependents: [] },
    totals: {
      sourceLoc: 2_500,
      authoredEvidenceLoc: 5_000,
      generatedEvidenceLoc: 0,
      corpusLoc: 0,
      ratioMilli,
      targetMilli: 10_000,
      sourceRoles: {
        product: 1_000,
        verificationEngine: 1_000,
        rustWasm: 100,
        workflowAuthority: 400,
        generated: 200,
      },
    },
  };
}

const packageName = fc.constantFrom(...PACKAGE_CATALOG.map((record) => record.name));
const staticGap = fc.constantFrom(
  'unit',
  'property',
  'component|integration|browser|e2e',
  'simulation|chaos',
  'fuzz',
  'benchmark',
);
const campaignGap = fc.constantFrom('mutation', 'mcdc');

describe('continuous assurance authority', () => {
  it('ignores only campaign-owned gaps while preserving every static gap regression', () => {
    fc.assert(
      fc.property(packageName, campaignGap, staticGap, (owner, semantic, continuous) => {
        const admitted = inventory();
        const baseline = baselineFromInventory(admitted);
        const current = inventory({ [owner]: [semantic, continuous] });
        expect(assuranceRegressions(current, baseline)).toEqual([
          { package: owner, kind: 'evidence-gap', evidenceGap: continuous },
        ]);
      }),
      { seed: 0xa55_01, numRuns: 250 },
    );
  });

  it('continues to reject any repository density decrease even when only campaign gaps are open', () => {
    fc.assert(
      fc.property(packageName, campaignGap, fc.integer({ min: 1, max: 1_999 }), (owner, semantic, ratio) => {
        const baseline = baselineFromInventory(inventory({}, 2_000));
        const current = inventory({ [owner]: [semantic] }, ratio);
        expect(assuranceRegressions(current, baseline)).toEqual([
          {
            package: 'repository',
            kind: 'density',
            priorMilli: 2_000,
            currentMilli: ratio,
          },
        ]);
      }),
      { seed: 0xa55_02, numRuns: 200 },
    );
  });

  it('does not require an ephemeral receipt merely because the committed baseline once observed one', () => {
    fc.assert(
      fc.property(packageName, fc.uniqueArray(campaignGap, { minLength: 1, maxLength: 2 }), (owner, gaps) => {
        const baseline = baselineFromInventory(inventory());
        expect(assuranceRegressions(inventory({ [owner]: gaps }), baseline)).toEqual([]);
      }),
      { seed: 0xa55_03, numRuns: 100 },
    );
  });

  it('rejects a static gap independent of whether it existed for another package', () => {
    fc.assert(
      fc.property(packageName, packageName, staticGap, (priorOwner, currentOwner, gap) => {
        fc.pre(priorOwner !== currentOwner);
        const baseline = baselineFromInventory(inventory({ [priorOwner]: [gap] }));
        const current = inventory({ [priorOwner]: [gap], [currentOwner]: [gap] });
        expect(assuranceRegressions(current, baseline)).toContainEqual({
          package: currentOwner,
          kind: 'evidence-gap',
          evidenceGap: gap,
        });
      }),
      { seed: 0xa55_04, numRuns: 180 },
    );
  });
});

describe('semantic campaign admission', () => {
  it('rejects every missing mutation or MC/DC receipt regardless of the historical baseline', () => {
    fc.assert(
      fc.property(
        packageName,
        fc.uniqueArray(campaignGap, { minLength: 1, maxLength: 2 }),
        fc.boolean(),
        (owner, gaps, baselineHadGaps) => {
          const baseline = baselineFromInventory(inventory(baselineHadGaps ? { [owner]: gaps } : {}));
          const regressions = assuranceRegressions(inventory({ [owner]: gaps }), baseline, {
            requireSemanticAssurance: true,
          });
          for (const gap of gaps) {
            expect(regressions).toContainEqual({
              package: owner,
              kind: 'evidence-gap',
              evidenceGap: gap,
            });
          }
        },
      ),
      { seed: 0xa55_05, numRuns: 200 },
    );
  });

  it('accepts the same source and density once the isolated campaign supplies all receipts', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2_000, max: 10_000 }), (ratio) => {
        const current = inventory({}, ratio);
        const baseline = baselineFromInventory(inventory({}, 2_000));
        expect(assuranceRegressions(current, baseline, { requireSemanticAssurance: true })).toEqual([]);
      }),
      { seed: 0xa55_06, numRuns: 100 },
    );
  });

  it('returns deterministic package/gap order for independently downloaded receipts', () => {
    fc.assert(
      fc.property(fc.uniqueArray(packageName, { minLength: 2, maxLength: 8 }), (owners) => {
        const gaps = Object.fromEntries(
          [...owners].reverse().map((owner, index) => [owner, index % 2 === 0 ? ['mutation'] : ['mcdc', 'mutation']]),
        );
        const baseline = baselineFromInventory(inventory());
        const regressions = assuranceRegressions(inventory(gaps), baseline, {
          requireSemanticAssurance: true,
        });
        expect(regressions).toEqual(
          [...regressions].sort(
            (left, right) =>
              left.package.localeCompare(right.package) ||
              (left.evidenceGap ?? '').localeCompare(right.evidenceGap ?? ''),
          ),
        );
      }),
      { seed: 0xa55_07, numRuns: 120 },
    );
  });

  it('never lets semantic admission hide an independent static or density regression', () => {
    fc.assert(
      fc.property(packageName, staticGap, fc.integer({ min: 1, max: 1_999 }), (owner, gap, ratio) => {
        const baseline = baselineFromInventory(inventory({}, 2_000));
        const regressions = assuranceRegressions(inventory({ [owner]: [gap] }, ratio), baseline, {
          requireSemanticAssurance: true,
        });
        expect(regressions).toContainEqual({
          package: 'repository',
          kind: 'density',
          priorMilli: 2_000,
          currentMilli: ratio,
        });
        expect(regressions).toContainEqual({ package: owner, kind: 'evidence-gap', evidenceGap: gap });
      }),
      { seed: 0xa55_08, numRuns: 160 },
    );
  });
});

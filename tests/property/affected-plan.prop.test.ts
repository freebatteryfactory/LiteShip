import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import {
  parseAffectedTestPlan,
  planAffectedTests,
  type AffectedRiskLevel,
} from '../../scripts/lib/affected-test-plan.js';

const INVENTORY = buildAssuranceInventory(process.cwd());
const RISK_RANK: Readonly<Record<AffectedRiskLevel, number>> = { low: 0, moderate: 1, high: 2, critical: 3 };
const PATHS = [
  'README.md',
  'packages/canonical/src/cbor.ts',
  'packages/core/src/authoring/boundary.ts',
  'packages/vite/src/index.ts',
  'tests/unit/core/authoring/boundary.test.ts',
  'tests/browser/adaptive-runtime.browser.test.ts',
  '.github/workflows/ci.yml',
  'orphan-runtime.ts',
] as const;
const pathSet = fc.uniqueArray(fc.constantFrom(...PATHS), { minLength: 0, maxLength: PATHS.length });

describe('affected-plan properties', () => {
  it('is invariant to changed-path order and duplication', () => {
    fc.assert(
      fc.property(pathSet, fc.array(fc.nat(), { maxLength: 16 }), (paths, noise) => {
        const permuted = [...paths].sort((a, b) => (noise[PATHS.indexOf(a)] ?? 0) - (noise[PATHS.indexOf(b)] ?? 0));
        const duplicated = [...permuted, ...permuted];
        expect(planAffectedTests(duplicated, PACKAGE_CATALOG, INVENTORY).planId).toBe(
          planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY).planId,
        );
      }),
      { seed: 0x1a11ce, numRuns: 100 },
    );
  });

  it('adding scope never lowers risk or removes required checks and prerequisites', () => {
    fc.assert(
      fc.property(pathSet, fc.constantFrom(...PATHS), (paths, additional) => {
        const before = planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
        const after = planAffectedTests([...paths, additional], PACKAGE_CATALOG, INVENTORY);
        expect(RISK_RANK[after.risk.level]).toBeGreaterThanOrEqual(RISK_RANK[before.risk.level]);
        for (const check of before.requiredChecks) expect(after.requiredChecks).toContain(check);
        for (const prerequisite of before.prerequisites) {
          expect(after.prerequisites.some((entry) => entry.id === prerequisite.id)).toBe(true);
        }
      }),
      { seed: 0xc10a5e, numRuns: 150 },
    );
  });

  it('every generated plan round-trips through the strict decoder', () => {
    fc.assert(
      fc.property(pathSet, (paths) => {
        const plan = planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
        expect(parseAffectedTestPlan(JSON.parse(JSON.stringify(plan)) as unknown)).toEqual(plan);
      }),
      { seed: 0xadd2e55, numRuns: 100 },
    );
  });
});

import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';

const INVENTORY = buildAssuranceInventory(process.cwd());

describe('affected-plan complexity contract', () => {
  it('plans the 250-path safety ceiling deterministically; timing belongs to the benchmark authority', () => {
    const paths = Array.from({ length: 250 }, (_, index) => `tests/unit/impact-${index}.test.ts`);
    const first = planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
    const second = planAffectedTests([...paths].reverse(), PACKAGE_CATALOG, INVENTORY);
    expect(first).toEqual(second);
    expect(first.changedPaths).toHaveLength(250);
    expect(first.estimatedCost.selectedNodeTests).toBeGreaterThanOrEqual(250);
  });
});

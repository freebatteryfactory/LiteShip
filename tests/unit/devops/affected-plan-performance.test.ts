import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';

const INVENTORY = buildAssuranceInventory(process.cwd());

describe('affected-plan complexity contract', () => {
  it('plans the 250-path safety ceiling repeatedly within a generous one-second budget', () => {
    const paths = Array.from({ length: 250 }, (_, index) => `tests/unit/impact-${index}.test.ts`);
    planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
    const started = performance.now();
    for (let run = 0; run < 20; run += 1) planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
    const elapsedMs = performance.now() - started;
    expect(elapsedMs).toBeLessThan(1_000);
  });
});

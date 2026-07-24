import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import { parseAffectedTestPlan, planAffectedTests } from '../../scripts/lib/affected-test-plan.js';

const INVENTORY = buildAssuranceInventory(process.cwd());

describe('affected-plan decoder fuzz', () => {
  it('fails closed for arbitrary foreign JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(() => parseAffectedTestPlan(value)).toThrow();
      }),
      { seed: 0xf022ed, numRuns: 250 },
    );
  });

  it('rejects stale digests, invalid platforms, and duplicate/foreign prerequisite rows', () => {
    const valid = planAffectedTests(['README.md'], PACKAGE_CATALOG, INVENTORY);
    const mutants: readonly unknown[] = [
      { ...valid, changedPaths: ['changed-after-addressing.ts'] },
      { ...valid, platforms: ['linux', 'plan9'] },
      { ...valid, prerequisites: [...valid.prerequisites, valid.prerequisites[0]!] },
      { ...valid, requiredChecks: [...valid.requiredChecks, 'check/foreign'] },
      { ...valid, affectedPackages: ['@liteship/foreign'] },
      { ...valid, artifacts: ['affected-plan'] },
      { ...valid, planId: `sha256:${'0'.repeat(64)}` },
    ];
    for (const mutant of mutants) expect(() => parseAffectedTestPlan(mutant)).toThrow();
  });

  it('either plans arbitrary path bytes deterministically or fails closed without partial output', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 80 }), { maxLength: 40 }), (paths) => {
        const first = planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
        const second = planAffectedTests(paths, PACKAGE_CATALOG, INVENTORY);
        expect(second.planId).toBe(first.planId);
        expect(parseAffectedTestPlan(first)).toEqual(first);
      }),
      { seed: 0x51ec7, numRuns: 150 },
    );
  });

  it('fails broad when diff/base confidence is unavailable', () => {
    const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, INVENTORY, {
      baseRef: 'origin/missing',
      baseSha: 'unresolved',
      headSha: 'unresolved',
      confidence: 'low',
      rationale: ['planted missing base'],
    });
    expect(plan).toMatchObject({ mode: 'full', confidence: 'low', browserRequired: true });
    expect(plan.risk.level).toBe('critical');
  });
});

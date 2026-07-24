import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { affectedPackageNames, planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import type { AssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';

function inventory(evidence: Readonly<Record<string, readonly string[]>>): AssuranceInventory {
  return {
    schemaVersion: 1,
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
      evidenceFiles: evidence[record.name] ?? [],
    })),
    totals: { sourceLoc: 25, authoredEvidenceLoc: 25, generatedEvidenceLoc: 0, ratioMilli: 1_000, targetMilli: 10_000 },
  };
}

describe('affected test planning', () => {
  it('walks reverse dependencies from the canonical catalog', () => {
    const affected = affectedPackageNames(['packages/canonical/src/cbor.ts'], PACKAGE_CATALOG);
    expect(affected).toContain('@liteship/canonical');
    expect(affected).toContain('@liteship/core');
    expect(affected).toContain('liteship');
    expect(affected.indexOf('@liteship/canonical')).toBeLessThan(affected.indexOf('@liteship/core'));
  });

  it('selects owned node evidence and signals browser authority without running browser files in Node', () => {
    const plan = planAffectedTests(
      ['packages/core/src/authoring/boundary.ts'],
      PACKAGE_CATALOG,
      inventory({
        '@liteship/core': ['tests/unit/core/authoring/boundary.test.ts', 'tests/browser/core-boundary.test.ts'],
      }),
    );
    expect(plan.mode).toBe('focused');
    expect(plan.testFiles).toContain('tests/unit/core/authoring/boundary.test.ts');
    expect(plan.testFiles).not.toContain('tests/browser/core-boundary.test.ts');
    expect(plan.browserRequired).toBe(true);
  });

  it.each(['package.json', 'pnpm-lock.yaml', 'scripts/package-catalog.ts', '.github/workflows/ci.yml'])(
    'fails broad when global authority %s changes',
    (path) => {
      expect(planAffectedTests([path], PACKAGE_CATALOG, inventory({}))).toMatchObject({ mode: 'full' });
    },
  );

  it('runs only governance canaries for prose-only changes', () => {
    const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}));
    expect(plan).toMatchObject({ mode: 'focused', affectedPackages: [], browserRequired: false });
    expect(plan.testFiles).toContain('tests/unit/devops/check-registry.test.ts');
  });
});

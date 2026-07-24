import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import {
  assertAffectedPlanHead,
  createAffectedPlan,
  writeAffectedGithubOutput,
  writeAffectedPlanFile,
} from '../../../scripts/affected-plan.js';
import {
  AFFECTED_PLAN_PREREQUISITES,
  affectedPackageNames,
  parseAffectedTestPlan,
  planAffectedTests,
} from '../../../scripts/lib/affected-test-plan.js';
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
  it('keeps the clean-checkout planner independent from built workspace packages', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/affected-plan.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"]@liteship\//u);
    expect(source).not.toMatch(/(?:^|\/)dist(?:\/|['"])/u);
    expect(source).not.toContain('./lib/spawn.js');
  });

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
    expect(plan.prerequisites).toEqual(AFFECTED_PLAN_PREREQUISITES);
    expect(plan.planId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(plan.changedPathDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(plan.risk.highestAssurance).toBe('L1');
    expect(plan.requiredChecks).toContain('check/test');
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

  it('disables optimization and fails broad when the selector error budget is exhausted', () => {
    const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}), {
      baseRef: 'origin/main',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      confidence: 'high',
      selectorErrorBudgetRemaining: 0,
    });
    expect(plan.mode).toBe('full');
    expect(plan.browserRequired).toBe(true);
    expect(plan.reason).toContain('error budget is exhausted');
    expect(plan.rationale).toContain('selector optimization disabled by error budget');
  });

  it('rejects partial, foreign, and prerequisite-free plans at the process boundary', () => {
    const valid = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}));
    expect(parseAffectedTestPlan(valid)).toEqual(valid);
    expect(() => parseAffectedTestPlan({ ...valid, schemaVersion: 1 })).toThrow(/schemaVersion/u);
    expect(() => parseAffectedTestPlan({ ...valid, prerequisites: [] })).toThrow(/workspace-build/u);
    expect(() => parseAffectedTestPlan({ ...valid, surprise: true })).toThrow(/keys/u);
    expect(() => parseAffectedTestPlan({ ...valid, reason: 'tampered after addressing' })).toThrow(/integrity/u);
  });

  it('writes no GitHub output when plan validation fails', () => {
    const directory = mkdtempSync(join(tmpdir(), 'liteship-affected-plan-'));
    const output = join(directory, 'github-output.txt');
    try {
      const valid = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}));
      writeAffectedGithubOutput(output, valid);
      expect(readFileSync(output, 'utf8')).toBe(`plan=${JSON.stringify(valid)}\n`);
      const planPath = join(directory, 'plan', 'affected.json');
      writeAffectedPlanFile(planPath, valid);
      expect(JSON.parse(readFileSync(planPath, 'utf8'))).toEqual(valid);
      const before = readFileSync(output, 'utf8');
      expect(() => writeAffectedGithubOutput(output, { ...valid, prerequisites: [] } as never)).toThrow(
        /workspace-build/u,
      );
      expect(readFileSync(output, 'utf8')).toBe(before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('propagates an unexpected planner-host failure instead of emitting a fallback success', () => {
    expect(() =>
      createAffectedPlan(process.cwd(), 'origin/main', () => {
        throw new Error('planted planner crash');
      }),
    ).toThrow('planted planner crash');
  });

  it('addresses equal plan inputs identically and changes identity when evidence selection changes', () => {
    const first = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}));
    const second = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}));
    const changed = planAffectedTests(['tests/unit/core/authoring/boundary.test.ts'], PACKAGE_CATALOG, inventory({}));
    expect(second.planId).toBe(first.planId);
    expect(changed.planId).not.toBe(first.planId);
  });

  it('refuses to execute a valid plan on a foreign checkout head', () => {
    const plan = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}), {
      baseRef: 'origin/main',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      confidence: 'high',
    });
    expect(() => assertAffectedPlanHead(plan, 'c'.repeat(40))).toThrow(/does not match checkout/u);
    expect(() => assertAffectedPlanHead(plan, 'b'.repeat(40))).not.toThrow();
  });
});

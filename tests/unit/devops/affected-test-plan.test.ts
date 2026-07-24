import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import {
  assertAffectedPlanHead,
  createAffectedPlan,
  readAffectedPlanFile,
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
import { forbiddenSourceImports } from '../../../scripts/lib/source-import-contract.js';

const CALIBRATION_ID = `sha256:${'c'.repeat(64)}` as const;

function inventory(evidence: Readonly<Record<string, readonly string[]>>): AssuranceInventory {
  return {
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
      evidenceFiles: evidence[record.name] ?? [],
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
}

describe('affected test planning', () => {
  it('keeps the clean-checkout planner independent from built workspace packages', () => {
    expect(
      forbiddenSourceImports(process.cwd(), 'scripts/affected-plan.ts', [
        { pattern: /^@liteship\//u, reason: 'workspace runtime package' },
        { pattern: /(?:^|\/)dist(?:\/|$)/u, reason: 'built output' },
        { pattern: /^\.\/lib\/spawn\.js$/u, reason: 'built CLI spawn helper' },
      ]),
    ).toEqual([]);
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

  it('fails broad when selector calibration evidence is absent', () => {
    const plan = createAffectedPlan(
      process.cwd(),
      'origin/main',
      () => ({ paths: ['README.md'], baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) }),
      () => null,
      () => inventory({}),
    );
    expect(plan.mode).toBe('full');
    expect(plan.browserRequired).toBe(true);
    expect(plan.selectorCalibrationId).toBeNull();
    expect(plan.rationale.join('\n')).toContain('selector calibration is missing');
  });

  it('rejects partial, foreign, and prerequisite-free plans at the process boundary', () => {
    const valid = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}), {
      baseRef: 'origin/main',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      confidence: 'high',
      selectorCalibrationId: CALIBRATION_ID,
    });
    expect(parseAffectedTestPlan(valid)).toEqual(valid);
    expect(() => parseAffectedTestPlan({ ...valid, schemaVersion: 1 })).toThrow(/schemaVersion/u);
    expect(() => parseAffectedTestPlan({ ...valid, prerequisites: [] })).toThrow(/workspace-build/u);
    expect(() => parseAffectedTestPlan({ ...valid, surprise: true })).toThrow(/keys/u);
    expect(() => parseAffectedTestPlan({ ...valid, reason: 'tampered after addressing' })).toThrow(/integrity/u);
  });

  it('writes no GitHub output when plan validation fails', () => {
    const directory = mkdtempSync(join(tmpdir(), 'liteship-affected-plan-'));
    try {
      const valid = planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory({}), {
        baseRef: 'origin/main',
        baseSha: 'a'.repeat(40),
        headSha: 'b'.repeat(40),
        confidence: 'high',
        selectorCalibrationId: CALIBRATION_ID,
      });
      const writes: string[] = [];
      const append = (_path: string, data: string): void => {
        writes.push(data);
      };
      writeAffectedGithubOutput('github-output.txt', valid, append);
      expect(writes).toEqual([
        `plan-id=${valid.planId}\nbrowser-required=${String(valid.browserRequired)}\nmode=${valid.mode}\n`,
      ]);
      const planPath = join(directory, 'plan', 'affected.json');
      writeAffectedPlanFile(planPath, valid);
      expect(readAffectedPlanFile(planPath)).toEqual(valid);
      expect(() =>
        writeAffectedGithubOutput('github-output.txt', { ...valid, prerequisites: [] } as never, append),
      ).toThrow(/workspace-build/u);
      expect(writes).toHaveLength(1);
      expect(() => writeAffectedPlanFile(planPath, { ...valid, prerequisites: [] } as never)).toThrow(
        /workspace-build/u,
      );
      expect(readAffectedPlanFile(planPath)).toEqual(valid);
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
      selectorCalibrationId: CALIBRATION_ID,
    });
    expect(() => assertAffectedPlanHead(plan, 'c'.repeat(40))).toThrow(/does not match checkout/u);
    expect(() => assertAffectedPlanHead(plan, 'b'.repeat(40))).not.toThrow();
  });
});

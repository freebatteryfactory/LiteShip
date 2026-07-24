import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import { admitReleasePlanBinding } from '../../../scripts/lib/release-plan-admission.js';
import type { AssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';

const HEAD = 'b'.repeat(40);
const CALIBRATION = `sha256:${'c'.repeat(64)}` as const;

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

function plan() {
  return planAffectedTests(['README.md'], PACKAGE_CATALOG, inventory, {
    baseRef: 'origin/main',
    baseSha: 'a'.repeat(40),
    headSha: HEAD,
    confidence: 'high',
    selectorCalibrationId: CALIBRATION,
  });
}

describe('release plan admission', () => {
  it('admits only the exact addressed plan for the exact checkout HEAD', () => {
    const affected = plan();
    const admitted = admitReleasePlanBinding({
      plan: affected,
      gitHead: HEAD,
      admittedPlanId: affected.planId,
    });
    expect(admitted).toEqual({ sourceCommit: HEAD, planId: affected.planId });
    expect(Object.isFrozen(admitted)).toBe(true);
  });

  it('refuses a plan addressed to another checkout before packing', () => {
    const affected = plan();
    expect(() =>
      admitReleasePlanBinding({
        plan: affected,
        gitHead: 'd'.repeat(40),
        admittedPlanId: affected.planId,
      }),
    ).toThrow(/does not match checkout HEAD/u);
  });

  it('refuses a plan other than the independently admitted plan identity', () => {
    const affected = plan();
    expect(() =>
      admitReleasePlanBinding({
        plan: affected,
        gitHead: HEAD,
        admittedPlanId: `sha256:${'d'.repeat(64)}`,
      }),
    ).toThrow(/does not match admitted plan/u);
  });

  it.each([
    ['missing admitted identity', { plan: plan(), gitHead: HEAD, admittedPlanId: undefined }],
    ['abbreviated head', { plan: plan(), gitHead: 'abc123', admittedPlanId: plan().planId }],
    ['foreign binding field', { plan: plan(), gitHead: HEAD, admittedPlanId: plan().planId, force: true }],
    ['missing binding field', { plan: plan(), gitHead: HEAD }],
  ])('strictly rejects %s', (_name, binding) => {
    expect(() => admitReleasePlanBinding(binding)).toThrow(TypeError);
  });

  it('reuses the affected-plan strict decoder instead of trusting a plan-shaped object', () => {
    const affected = plan();
    expect(() =>
      admitReleasePlanBinding({
        plan: { ...affected, reason: 'edited after addressing' },
        gitHead: HEAD,
        admittedPlanId: affected.planId,
      }),
    ).toThrow(/integrity digest/u);
    expect(() =>
      admitReleasePlanBinding({
        plan: { ...affected, foreign: true },
        gitHead: HEAD,
        admittedPlanId: affected.planId,
      }),
    ).toThrow(/keys are invalid/u);
  });

  it('wires admission before any package-manager query or bundle packing', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/build-release-artifacts.ts'), 'utf8');
    const admission = source.indexOf('const binding = admitReleasePlanBinding(');
    const packageManager = source.indexOf("commandOutput('pnpm', ['--version']");
    const packing = source.indexOf('await buildReleaseArtifactBundle({');
    expect(admission).toBeGreaterThan(0);
    expect(admission).toBeLessThan(packageManager);
    expect(packageManager).toBeLessThan(packing);
    expect(source).toContain("admittedPlanId: process.env['LITESHIP_AFFECTED_PLAN_ID']");
    expect(source).toContain('sourceCommit: binding.sourceCommit');
    expect(source).toContain('planId: binding.planId');
  });

  it('projects the independently admitted plan ID into the release builder before packing', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/release.yml'), 'utf8');
    const admission = workflow.indexOf('LITESHIP_AFFECTED_PLAN_ID=$(jq -r .planId .liteship/affected-plan.json)');
    const packing = workflow.indexOf('pnpm exec tsx scripts/build-release-artifacts.ts release-artifacts/tarballs');
    expect(admission).toBeGreaterThan(0);
    expect(admission).toBeLessThan(packing);
  });
});

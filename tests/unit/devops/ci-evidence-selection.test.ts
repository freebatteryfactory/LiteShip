import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import type { AssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import { jobNameMatches, selectCheckEvidence } from '../../../scripts/lib/ci-evidence-selection.js';

const INVENTORY: AssuranceInventory = {
  schemaVersion: 4,
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
  evidenceOwnership: {
    packageFiles: [],
    repositoryTooling: { owner: 'repository/tooling', authoredEvidenceLoc: 0, generatedEvidenceLoc: 0, files: [] },
  },
  nodeTestSelection: { entrypoints: [], dependents: [] },
  totals: {
    sourceLoc: PACKAGE_CATALOG.length,
    authoredEvidenceLoc: PACKAGE_CATALOG.length,
    generatedEvidenceLoc: 0,
    corpusLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    sourceRoles: {
      product: PACKAGE_CATALOG.length,
      verificationEngine: 0,
      rustWasm: 0,
      workflowAuthority: 0,
      generated: 0,
    },
  },
};

const plan = planAffectedTests(['packages/core/src/index.ts'], PACKAGE_CATALOG, INVENTORY, {
  baseRef: 'origin/main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  confidence: 'high',
  selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
});

const rustPlan = planAffectedTests(['crates/liteship-compute/src/lib.rs'], PACKAGE_CATALOG, INVENTORY, {
  baseRef: 'origin/main',
  baseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  confidence: 'high',
  selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
});

describe('CI evidence selection', () => {
  it('matches direct, matrix, and reusable-workflow jobs by exact leaf identity', () => {
    expect(jobNameMatches('format', 'format')).toBe(true);
    expect(jobNameMatches('browser-e2e (chromium)', 'browser-e2e')).toBe(true);
    expect(jobNameMatches('Complete frozen-head authority / format', 'format')).toBe(true);
    expect(jobNameMatches('Complete frozen-head authority / browser-e2e (webkit)', 'browser-e2e')).toBe(true);
    expect(jobNameMatches('not-format', 'format')).toBe(false);
    expect(jobNameMatches('format-extra', 'format')).toBe(false);
  });

  it('binds PR evidence to the addressed affected checks and cross-platform Node proof', () => {
    const selected = selectCheckEvidence(plan, 'pull_request');
    expect(selected.map((entry) => entry.requirement.checkId)).toEqual([...plan.requiredChecks].sort());
    expect(selected.find((entry) => entry.requirement.checkId === 'check/test')?.jobNames).toEqual([
      'pr-affected',
      'pr-windows-affected',
    ]);
  });

  it('binds changed Rust formatting evidence to the specialized Rust authority', () => {
    const pullRequest = selectCheckEvidence(rustPlan, 'pull_request');
    expect(pullRequest.find((entry) => entry.requirement.checkId === 'check/rustfmt')?.jobNames).toEqual([
      'rust-wasm-parity',
    ]);
    const scheduled = selectCheckEvidence(rustPlan, 'schedule');
    expect(scheduled.find((entry) => entry.requirement.checkId === 'check/rustfmt')?.jobNames).toEqual([
      'rust-wasm-parity',
    ]);
  });

  it('binds push evidence to every release check and the registry-projected CI owners', () => {
    const selected = selectCheckEvidence(plan, 'push');
    expect(selected.length).toBeGreaterThan(plan.requiredChecks.length);
    expect(selected.find((entry) => entry.requirement.checkId === 'check/typecheck')?.jobNames).toEqual([
      'truth-linux-parallel-preflight',
    ]);
    expect(selected.find((entry) => entry.requirement.checkId === 'check/test-e2e')?.jobNames).toEqual([
      'browser-e2e',
      'truth-linux-parallel-integration',
    ]);
    expect(selected.find((entry) => entry.requirement.checkId === 'check/test')?.jobNames).toEqual([
      'truth-linux-parallel-test',
      'windows-smoke',
    ]);
    expect(selected.find((entry) => entry.requirement.checkId === 'check/coverage')?.jobNames).toEqual([
      'truth-linux-parallel-coverage-browser',
      'truth-linux-parallel-merge-coverage',
      'truth-linux-parallel-test',
    ]);
  });

  it('requires broad serial authority for scheduled/manual events and matches matrix suffixes exactly', () => {
    const selected = selectCheckEvidence(plan, 'schedule');
    expect(selected.find((entry) => entry.requirement.checkId === 'check/typecheck')?.jobNames).toEqual([
      'truth-linux',
    ]);
    expect(jobNameMatches('browser-e2e (webkit)', 'browser-e2e')).toBe(true);
    expect(jobNameMatches('browser-e2e-foreign', 'browser-e2e')).toBe(false);
  });
});

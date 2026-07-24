import { describe, expect, it } from 'vitest';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';
import { jobNameMatches, selectCheckEvidence } from '../../../scripts/lib/ci-evidence-selection.js';

const plan = planAffectedTests(
  ['packages/core/src/index.ts'],
  PACKAGE_CATALOG,
  buildAssuranceInventory(process.cwd()),
  {
    baseRef: 'origin/main',
    baseSha: 'a'.repeat(40),
    headSha: 'b'.repeat(40),
    confidence: 'high',
    selectorCalibrationId: `sha256:${'c'.repeat(64)}`,
  },
);

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

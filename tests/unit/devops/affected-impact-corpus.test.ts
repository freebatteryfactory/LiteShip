import { describe, expect, it } from 'vitest';
import CORPUS_JSON from '../../fixtures/affected-impact-corpus.json';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import { planAffectedTests, type AffectedRiskLevel } from '../../../scripts/lib/affected-test-plan.js';

interface ImpactCase {
  readonly id: string;
  readonly paths: readonly string[];
  readonly mode: 'focused' | 'full';
  readonly minimumRisk: AffectedRiskLevel;
  readonly browserRequired: boolean;
  readonly requiredOwners: readonly string[];
  readonly requiredChecks: readonly string[];
}

const RISK_RANK: Readonly<Record<AffectedRiskLevel, number>> = { low: 0, moderate: 1, high: 2, critical: 3 };
const CORPUS = CORPUS_JSON as readonly ImpactCase[];
const INVENTORY = buildAssuranceInventory(process.cwd());

describe('affected-plan impact corpus', () => {
  it('contains independent low, critical, unknown-owner, and browser controls', () => {
    expect(new Set(CORPUS.map((entry) => entry.id))).toEqual(
      new Set([
        'prose-only',
        'canonical-kernel',
        'workflow-authority',
        'unknown-runtime-owner',
        'browser-evidence-change',
      ]),
    );
  });

  it.each(CORPUS)('$id selects at least its required evidence', (entry) => {
    const plan = planAffectedTests(entry.paths, PACKAGE_CATALOG, INVENTORY);
    expect(plan.mode).toBe(entry.mode);
    expect(RISK_RANK[plan.risk.level]).toBeGreaterThanOrEqual(RISK_RANK[entry.minimumRisk]);
    expect(plan.browserRequired).toBe(entry.browserRequired);
    for (const owner of entry.requiredOwners) expect(plan.affectedPackages).toContain(owner);
    for (const check of entry.requiredChecks) expect(plan.requiredChecks).toContain(check);
  });
});

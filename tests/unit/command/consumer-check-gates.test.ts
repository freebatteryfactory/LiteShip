/** Consumer check-gates context laws. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import * as commandHost from '@liteship/command/host';
import { createNodeCommandContext } from '@liteship/command/host';
import {
  checkGovernanceFactsFor,
  GOVERNANCE_SURFACE_PATHS,
  hasCheckGovernanceSurface,
} from '../../../packages/command/src/host/check-governance.js';

/** The smallest ledger that satisfies the review-findings grammar: schema + no findings. */
const EMPTY_REVIEW_LEDGER = `${JSON.stringify({ schema: 'liteship/review-findings@1', findings: [] })}\n`;

/** A review ledger carrying one live relaxation, so the `review` store produces a fact. */
const DISPUTED_REVIEW_LEDGER = `${JSON.stringify({
  schema: 'liteship/review-findings@1',
  findings: [
    {
      id: 'fixture/disputed',
      summary: 'hermetic fixture entry',
      status: 'disputed',
      owner: 'fixture',
      justification: 'hermetic test fixture',
      expiry: '2999-01-01',
      acknowledged: true,
    },
  ],
})}\n`;

/** A testing ledger carrying one live waiver, so the `ledger` store produces a fact. */
const WAIVED_TESTING_LEDGER =
  'traces:\n  - id: INV-EX-LAW\n    waiver:\n      owner: fixture\n' +
  '      justification: "hermetic test fixture"\n      expiry: "2999-01-01"\n';

/** Fixed injected clock — the expiry arithmetic must never read the host wall-clock. */
const NOW = new Date('2026-01-01T00:00:00.000Z');

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function consumerRoot(source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-consumer-gates-'));
  roots.push(root);
  mkdirSync(join(root, 'packages', 'app', 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'consumer', scripts: {} }));
  writeFileSync(join(root, 'packages', 'app', 'src', 'subject.ts'), source);
  return root;
}

/** A tree carrying EVERY declared governance path, with both record stores populated. */
function governanceRoot(): string {
  const root = consumerRoot('export const ok = true;\n');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'packages', 'command', 'src', 'checks'), { recursive: true });
  mkdirSync(join(root, 'traceability'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'package-catalog.ts'), 'export {};\n');
  writeFileSync(join(root, 'packages', 'command', 'src', 'checks', 'registry.ts'), 'export {};\n');
  writeFileSync(join(root, 'traceability', 'testing-ledger.yaml'), WAIVED_TESTING_LEDGER);
  writeFileSync(join(root, 'traceability', 'review-findings.json'), DISPUTED_REVIEW_LEDGER);
  return root;
}

describe('packed-consumer check gates', () => {
  it('runs semantic gates without borrowing LiteShip repository governance records', async () => {
    const root = consumerRoot("export function boom(): void { throw new Error('planted'); }\n");

    expect(hasCheckGovernanceSurface(root)).toBe(false);
    const result = await createNodeCommandContext({ cwd: root }).runGauntlet!();

    expect(result.blocked).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === 'gauntlet/no-bare-throw')).toBe(true);
  });

  it('admits repository governance only when every canonical owner exists', () => {
    const root = consumerRoot('export const ok = true;\n');
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'packages', 'command', 'src', 'checks'), { recursive: true });
    writeFileSync(join(root, 'scripts', 'package-catalog.ts'), 'export {};\n');
    writeFileSync(join(root, 'packages', 'command', 'src', 'checks', 'registry.ts'), 'export {};\n');

    expect(hasCheckGovernanceSurface(root)).toBe(false);
    mkdirSync(join(root, 'traceability'), { recursive: true });
    writeFileSync(join(root, 'traceability', 'testing-ledger.yaml'), 'entries: []\n');
    expect(hasCheckGovernanceSurface(root)).toBe(false);
    writeFileSync(join(root, 'traceability', 'review-findings.json'), EMPTY_REVIEW_LEDGER);
    expect(hasCheckGovernanceSurface(root)).toBe(true);
  });
});

/**
 * THE NO-BYPASS LAW.
 *
 * `buildCheckGovernanceFacts` is the STRICT half: it refuses a tree missing any
 * record it reads, because a governance record that reads as absent must never
 * read as "no findings". That refusal is only safe behind an admission probe,
 * and leaving the probe to each caller is exactly how the two call sites
 * diverged — `context.ts` guarded, `repo-ir-gauntlet.ts` did not, and every
 * hermetic tree the gauntlet builds hard-failed once a fourth record was
 * enrolled.
 *
 * So the barrel publishes only the entry point that CARRIES its own admission.
 * A consumer cannot reach the strict half to call it unguarded — this is a
 * compile error for anyone who tries, and this law is the standing proof that
 * the barrel was never widened back.
 */
describe('the governance authority publishes only the admission-carrying entry point', () => {
  it('the host barrel exposes checkGovernanceFactsFor and NOT the strict builder', () => {
    expect(Object.keys(commandHost)).not.toContain('buildCheckGovernanceFacts');
    expect(Object.keys(commandHost)).toContain('checkGovernanceFactsFor');
  });
});

/**
 * THE ADMISSION LAW, quantified over the real surface.
 *
 * The failure this closes was not "one path was forgotten" — it was that the
 * probe's path set and the builder's read set were maintained independently, so
 * nothing FORCED a newly required record into the probe. Enumerating
 * `GOVERNANCE_SURFACE_PATHS` rather than restating it means a record enrolled
 * tomorrow arrives with its own case already written: drop that one path and
 * the tree must fall back to neutral facts instead of throwing.
 *
 * ANTI-VACUITY: the positive control asserts the fully-populated tree IS
 * admitted and DOES produce waivers. Without it every per-path case would pass
 * trivially if admission were hard-wired to `false`.
 */
describe('every declared governance path is load-bearing for admission', () => {
  it('the surface is non-empty and a complete tree is admitted with real facts', () => {
    expect(GOVERNANCE_SURFACE_PATHS.length).toBeGreaterThanOrEqual(4);
    const root = governanceRoot();

    expect(hasCheckGovernanceSurface(root)).toBe(true);
    // Both traceability records were actually READ, not merely present — the
    // static gauntlet waivers would satisfy a bare non-empty count on their own.
    const stores = new Set(checkGovernanceFactsFor(root, NOW).waivers.map((waiver) => waiver.store));
    expect(stores).toContain('ledger');
    expect(stores).toContain('review');
  });

  for (const missing of GOVERNANCE_SURFACE_PATHS) {
    it(`a tree missing ${missing} is refused admission and gets neutral facts, never a throw`, () => {
      const root = governanceRoot();
      rmSync(join(root, missing), { force: true });

      expect(hasCheckGovernanceSurface(root)).toBe(false);
      const facts = checkGovernanceFactsFor(root, NOW);
      expect(facts.waivers).toStrictEqual([]);
      expect(facts.partition.scripts).toStrictEqual([]);
    });
  }
});

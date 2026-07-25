import { describe, expect, it } from 'vitest';
import { buildAffectedResultEvidence } from '../../../scripts/lib/affected-result-evidence.js';

const HEAD = 'a'.repeat(40);

describe('affected result evidence', () => {
  it('records an upstream failure and honestly skipped Vitest authority without fabricating JUnit', () => {
    const receipt = buildAffectedResultEvidence(
      {
        lane: 'pr-linux',
        headSha: HEAD,
        steps: [
          { id: 'quick', outcome: 'failure' },
          { id: 'vitest', outcome: 'skipped', evidencePath: 'reports/vitest.xml' },
        ],
      },
      () => false,
    );

    expect(receipt.integrity).toBe(true);
    expect(receipt.steps[1]).toEqual({
      id: 'vitest',
      outcome: 'skipped',
      evidence: { path: 'reports/vitest.xml', present: false },
    });
  });

  it.each(['success', 'failure', 'cancelled'] as const)(
    'fails integrity when a %s test process leaves no promised JUnit',
    (outcome) => {
      const receipt = buildAffectedResultEvidence(
        {
          lane: 'pr-windows',
          headSha: HEAD,
          steps: [{ id: 'vitest', outcome, evidencePath: 'reports/vitest.xml' }],
        },
        () => false,
      );
      expect(receipt.integrity).toBe(false);
    },
  );

  it('admits a failed test process when its diagnostic evidence exists', () => {
    const receipt = buildAffectedResultEvidence(
      {
        lane: 'pr-browser',
        headSha: HEAD,
        steps: [
          { id: 'vitest', outcome: 'failure', evidencePath: 'reports/vitest.xml' },
          { id: 'e2e', outcome: 'skipped', evidencePath: 'reports/playwright.xml' },
        ],
      },
      (path) => path === 'reports/vitest.xml',
    );
    expect(receipt.integrity).toBe(true);
  });

  it('rejects malformed or duplicate authority identities', () => {
    expect(() =>
      buildAffectedResultEvidence(
        {
          lane: 'PR Linux',
          headSha: HEAD,
          steps: [{ id: 'vitest', outcome: 'success' }],
        },
        () => true,
      ),
    ).toThrow(/lane/u);
    expect(() =>
      buildAffectedResultEvidence(
        {
          lane: 'pr-linux',
          headSha: HEAD,
          steps: [
            { id: 'vitest', outcome: 'success' },
            { id: 'vitest', outcome: 'success' },
          ],
        },
        () => true,
      ),
    ).toThrow(/duplicated/u);
  });
});

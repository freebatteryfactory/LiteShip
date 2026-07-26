import { describe, expect, it } from 'vitest';
import {
  admitAffectedResultEvidence,
  buildAffectedResultEvidence,
  parseAffectedResultEvidence,
  type AffectedResultStepInput,
} from '../../../scripts/lib/affected-result-evidence.js';

const HEAD = 'a'.repeat(40);
const PLAN = `sha256:${'b'.repeat(64)}` as const;

function receipt(
  lane: string,
  steps: readonly { id: string; outcome: 'success' | 'failure' | 'cancelled' | 'skipped'; evidencePath?: string }[],
  options: { headSha?: string; planId?: `sha256:${string}`; exists?: boolean } = {},
) {
  return buildAffectedResultEvidence(
    { lane, headSha: options.headSha ?? HEAD, planId: options.planId ?? PLAN, steps },
    () => options.exists ?? true,
  );
}

function inputsOf(value: ReturnType<typeof receipt>): readonly AffectedResultStepInput[] {
  return value.steps.map((step) => ({
    id: step.id,
    outcome: step.outcome,
    ...(step.evidence === undefined ? {} : { evidencePath: step.evidence.path }),
  }));
}

describe('affected result evidence', () => {
  it('records an upstream failure and honestly skipped Vitest authority without fabricating JUnit', () => {
    const receipt = buildAffectedResultEvidence(
      {
        lane: 'pr-linux',
        headSha: HEAD,
        planId: PLAN,
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
          planId: PLAN,
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
        planId: PLAN,
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
          planId: PLAN,
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
          planId: PLAN,
          steps: [
            { id: 'vitest', outcome: 'success' },
            { id: 'vitest', outcome: 'success' },
          ],
        },
        () => true,
      ),
    ).toThrow(/duplicated/u);
  });

  it('strictly parses an emitted receipt and rejects a forged integrity bit', () => {
    const emitted = receipt('pr-windows', [{ id: 'vitest', outcome: 'success', evidencePath: 'result.xml' }]);
    expect(parseAffectedResultEvidence(JSON.parse(JSON.stringify(emitted)))).toEqual(emitted);
    expect(() => parseAffectedResultEvidence({ ...emitted, integrity: false })).toThrow(/integrity/u);
  });

  it('admits exactly the selected successful lanes and permits only an unselected benchmark skip', () => {
    expect(
      admitAffectedResultEvidence({
        headSha: HEAD,
        planId: PLAN,
        browserRequired: true,
        benchmarkRequired: false,
        receipts: [
          receipt('pr-linux', [
            { id: 'quick', outcome: 'success' },
            { id: 'vitest', outcome: 'success', evidencePath: 'node.xml' },
            { id: 'benchmark', outcome: 'skipped' },
          ]),
          receipt('pr-windows', [{ id: 'vitest', outcome: 'success', evidencePath: 'windows.xml' }]),
          receipt('pr-browser', [
            { id: 'vitest', outcome: 'success', evidencePath: 'browser.xml' },
            { id: 'e2e', outcome: 'success', evidencePath: 'e2e.xml' },
          ]),
        ],
      }).verdict,
    ).toBe('accepted');
  });

  it.each([
    ['missing lane', (items: ReturnType<typeof receipt>[]) => items.slice(0, 1), /lane set is incomplete/u],
    [
      'stale head',
      (items: ReturnType<typeof receipt>[]) => [
        receipt('pr-linux', inputsOf(items[0]!), { headSha: 'c'.repeat(40) }),
        items[1]!,
      ],
      /stale for head/u,
    ],
    [
      'skipped selected step',
      (items: ReturnType<typeof receipt>[]) => [
        receipt('pr-linux', [
          { id: 'quick', outcome: 'success' },
          { id: 'vitest', outcome: 'skipped', evidencePath: 'node.xml' },
          { id: 'benchmark', outcome: 'success' },
        ]),
        items[1]!,
      ],
      /expected success/u,
    ],
    [
      'stale plan',
      (items: ReturnType<typeof receipt>[]) => [
        receipt('pr-linux', inputsOf(items[0]!), { planId: `sha256:${'d'.repeat(64)}` }),
        items[1]!,
      ],
      /stale for plan/u,
    ],
  ] as const)('rejects %s evidence', (_label, mutate, expected) => {
    const valid = [
      receipt('pr-linux', [
        { id: 'quick', outcome: 'success' },
        { id: 'vitest', outcome: 'success', evidencePath: 'node.xml' },
        { id: 'benchmark', outcome: 'success' },
      ]),
      receipt('pr-windows', [{ id: 'vitest', outcome: 'success', evidencePath: 'windows.xml' }]),
    ];
    expect(() =>
      admitAffectedResultEvidence({
        headSha: HEAD,
        planId: PLAN,
        browserRequired: false,
        benchmarkRequired: true,
        receipts: mutate(valid),
      }),
    ).toThrow(expected);
  });
});

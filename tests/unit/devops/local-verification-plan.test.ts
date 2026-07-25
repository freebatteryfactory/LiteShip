import { describe, expect, test } from 'vitest';
import { buildLocalVerificationPlan, isTypeDocProofInput } from '../../../scripts/lib/local-verification-plan.js';

describe('local verification plan', () => {
  test.each([
    'packages/core/src/index.ts',
    'packages/_spine/core.d.ts',
    'packages/_spine/typedoc-entry.ts',
    'typedoc.json',
    'docs/api/index.md',
    'packages\\core\\src\\index.ts',
  ])('classifies %s as a TypeDoc proof input', (path) => {
    expect(isTypeDocProofInput(path)).toBe(true);
  });

  test.each(['scripts/preflight.ts', 'tests/unit/core/example.test.ts', 'README.md'])(
    'does not classify %s as a TypeDoc proof input',
    (path) => {
      expect(isTypeDocProofInput(path)).toBe(false);
    },
  );

  test('always includes the full docs proof for a workspace preflight', () => {
    const plan = buildLocalVerificationPlan({ staged: false });
    expect(plan.docsReason).toBe('workspace-authority');
    expect(plan.steps.map((step) => step.label)).toEqual([
      'format:check',
      'lint:structural',
      'lint',
      'typecheck',
      'check-invariants',
      'docs:check',
    ]);
  });

  test('runs TypeDoc for relevant staged changes and omits only that expensive proof otherwise', () => {
    const affected = buildLocalVerificationPlan({ staged: true, changedPaths: ['packages/core/src/index.ts'] });
    const unaffected = buildLocalVerificationPlan({ staged: true, changedPaths: ['scripts/preflight.ts'] });

    expect(affected.docsReason).toBe('staged-docs-input');
    expect(affected.steps.at(-1)?.argv).toEqual(['run', 'docs:check:local']);
    expect(unaffected.docsReason).toBe('not-affected');
    expect(unaffected.steps.some((step) => step.label === 'docs:check')).toBe(false);
    expect(unaffected.steps.some((step) => step.label === 'check-invariants')).toBe(true);
  });

  test('does not duplicate the TypeScript build before typecheck', () => {
    const plan = buildLocalVerificationPlan({ staged: false });
    expect(plan.steps.filter((step) => step.label === 'typecheck')).toHaveLength(1);
    expect(plan.steps.some((step) => step.label === 'build')).toBe(false);
    expect(plan.steps.map((step) => step.argv.slice(0, 2))).toEqual([
      ['run', 'format:check'],
      ['run', 'lint:structural'],
      ['run', 'lint'],
      ['run', 'typecheck'],
      ['exec', 'tsx'],
      ['run', 'docs:check:local'],
    ]);
  });
});

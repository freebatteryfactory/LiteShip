import { describe, expect, test } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import {
  buildLocalVerificationPlan,
  isCiContractInput,
  isTypeDocProofInput,
  projectRepositoryQuickSteps,
} from '../../../scripts/lib/local-verification-plan.js';

describe('local verification plan', () => {
  test.each([
    'packages/core/src/index.ts',
    'packages/_spine/core.d.ts',
    'scripts/gen-spine-surface.ts',
    'scripts/lib/spine-surface-contract.ts',
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
      'format',
      'lint-structural',
      'lockfile-frozen',
      'prebuild-dist-free',
      'workflow-output-safety',
      'workspace-deps',
      'governed-exceptions',
      'lint',
      'typecheck',
      'docs-fast',
      'assurance-density',
      'test-constitution',
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
    expect(unaffected.steps.some((step) => step.label === 'assurance-density')).toBe(true);
    expect(unaffected.steps.some((step) => step.label === 'test-constitution')).toBe(true);
    expect(unaffected.steps.some((step) => step.label === 'check-invariants')).toBe(true);
  });

  test('does not duplicate the TypeScript build before typecheck', () => {
    const plan = buildLocalVerificationPlan({ staged: false });
    expect(plan.steps.filter((step) => step.label === 'typecheck')).toHaveLength(1);
    expect(plan.steps.some((step) => step.label === 'build')).toBe(false);
    expect(plan.steps.map((step) => step.argv.slice(0, 2))).toEqual([
      ['run', 'format:check'],
      ['run', 'lint:structural'],
      ['run', 'lockfile:gate'],
      ['run', 'prebuild:gate'],
      ['run', 'workflow-output:gate'],
      ['run', 'workspace-deps:gate'],
      ['run', 'governed-exceptions:gate'],
      ['run', 'lint'],
      ['run', 'typecheck'],
      ['run', 'docs:check:fast'],
      ['run', 'assurance:gate'],
      ['run', 'test:constitution'],
      ['exec', 'tsx'],
      ['run', 'docs:check:local'],
    ]);
  });

  test.each([
    '.github/workflows/ci.yml',
    'scripts/ci-plan.ts',
    'scripts/affected-plan.ts',
    'scripts/lib/new-ci-helper.ts',
    'packages/command/src/checks/registry.ts',
    'tests/unit/meta/ci-registry-parity.test.ts',
  ])('classifies %s as a CI contract input', (path) => {
    expect(isCiContractInput(path)).toBe(true);
  });

  test('staged CI-contract changes append the parity proof; unrelated changes do not', () => {
    const touched = buildLocalVerificationPlan({ staged: true, changedPaths: ['.github/workflows/ci.yml'] });
    const untouched = buildLocalVerificationPlan({ staged: true, changedPaths: ['README.md'] });
    expect(touched.steps.some((step) => step.label === 'ci-registry-parity')).toBe(true);
    expect(untouched.steps.some((step) => step.label === 'ci-registry-parity')).toBe(false);
    // Workspace mode leaves parity to the full vitest authority it already runs under.
    expect(
      buildLocalVerificationPlan({ staged: false }).steps.some((step) => step.label === 'ci-registry-parity'),
    ).toBe(false);
  });

  test('is exactly the blocking repository quick projection and cannot silently omit a new blocker', () => {
    const expected = CHECK_REGISTRY.filter(
      (check) =>
        check.authority === 'blocking' && check.profiles.includes('quick') && check.contexts.includes('repository'),
    ).map((check) => check.id);
    expect(projectRepositoryQuickSteps().map((step) => step.checkId)).toEqual(expected);
    expect(
      buildLocalVerificationPlan({ staged: true, changedPaths: [] })
        .steps.map((step) => step.checkId)
        .filter((checkId): checkId is string => checkId !== null),
    ).toEqual(expected);
  });
});

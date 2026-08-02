import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import {
  WORKFLOW_READER_FAMILIES,
  assertLocalVerificationCheckPartition,
  buildLocalVerificationPlan,
  discoverWorkflowContractTestPaths,
  formatLocalVerificationCheckPartition,
  isCiContractInput,
  isTypeDocProofInput,
  projectRepositoryQuickSteps,
  workflowContractTestPaths,
  workflowReaderFamiliesCoveredByTestSource,
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
      'security-minimum',
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
      'projections',
      'ci-contract',
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
      ['run', 'security:minimum'],
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
      ['exec', 'vitest'],
      ['exec', 'vitest'],
      ['run', 'docs:check:local'],
    ]);
  });

  test.each([
    '.github/workflows/ci.yml',
    'scripts/ci-plan.ts',
    'scripts/affected-plan.ts',
    'scripts/lib/new-ci-helper.ts',
    'packages/command/src/checks/registry.ts',
    'packages/cli/src/internal/workflow-action-pins.ts',
    'tests/property/workflow-scanner-grammar.prop.test.ts',
    'tests/unit/cli/lib/campaign-wall-budget.test.ts',
    'tests/unit/meta/ci-registry-parity.test.ts',
  ])('classifies %s as a CI contract input', (path) => {
    expect(isCiContractInput(path)).toBe(true);
  });

  test('staged CI-contract changes append the contract proof; unrelated changes do not', () => {
    const touched = buildLocalVerificationPlan({ staged: true, changedPaths: ['.github/workflows/ci.yml'] });
    const untouched = buildLocalVerificationPlan({ staged: true, changedPaths: ['README.md'] });
    expect(touched.steps.some((step) => step.label === 'ci-contract')).toBe(true);
    expect(untouched.steps.some((step) => step.label === 'ci-contract')).toBe(false);
    // Workspace authority is fail-closed: it cannot infer that no CI contract
    // input changed, so it always carries the complete contract proof.
    expect(buildLocalVerificationPlan({ staged: false }).steps.some((step) => step.label === 'ci-contract')).toBe(true);
  });

  test('classifies imports from every declared workflow-reader family', () => {
    const syntheticImports = WORKFLOW_READER_FAMILIES.map((family, index) =>
      index === 0
        ? `import '../../../${family.owner.replace(/\.ts$/u, '.js')}';`
        : `import { law${index} } from '../../../${family.owner.replace(/\.ts$/u, '.js')}';`,
    ).join('\n');
    expect(workflowReaderFamiliesCoveredByTestSource(syntheticImports)).toEqual(
      WORKFLOW_READER_FAMILIES.map((family) => family.id),
    );
    expect(
      workflowReaderFamiliesCoveredByTestSource(
        `// scripts/lib/workflow-output-contract.js\nconst note = 'workflow-action-pins.js';`,
      ),
    ).toEqual([]);
  });

  test('the live discovery fails closed on an empty census or an uncovered declared reader family', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-workflow-law-census-'));
    try {
      mkdirSync(join(root, 'tests'), { recursive: true });
      expect(() => discoverWorkflowContractTestPaths(root)).toThrow(/discovered zero covering tests/u);

      const completeSource = WORKFLOW_READER_FAMILIES.map(
        (family) => `import '../../../${family.owner.replace(/\.ts$/u, '.js')}';`,
      ).join('\n');
      writeFileSync(join(root, 'tests', 'complete.test.ts'), completeSource);
      expect(discoverWorkflowContractTestPaths(root)).toEqual(['tests/complete.test.ts']);

      const omitted = WORKFLOW_READER_FAMILIES.at(-1);
      expect(omitted).toBeDefined();
      writeFileSync(
        join(root, 'tests', 'complete.test.ts'),
        WORKFLOW_READER_FAMILIES.slice(0, -1)
          .map((family) => `import '../../../${family.owner.replace(/\.ts$/u, '.js')}';`)
          .join('\n'),
      );
      expect(() => discoverWorkflowContractTestPaths(root)).toThrow(
        `no covering test for declared reader families: ${omitted?.id}`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('every workflow-contract law is enrolled in the staged ci.yml plan', () => {
    const contractLaws = workflowContractTestPaths();
    expect(contractLaws).toHaveLength(20);

    const argv = buildLocalVerificationPlan({ staged: true, changedPaths: ['.github/workflows/ci.yml'] }).steps.flatMap(
      (step) => step.argv,
    );
    expect(contractLaws.filter((path) => !argv.includes(path))).toEqual([]);
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

  test('partitions every live registry check exactly once without counting local meta steps', () => {
    const workspace = buildLocalVerificationPlan({ staged: false });
    const staged = buildLocalVerificationPlan({ staged: true, changedPaths: ['README.md'] });

    expect(workspace.schema).toBe('liteship/local-verification-plan@2');
    for (const plan of [workspace, staged]) {
      const partition = [...plan.registryChecks.selected, ...plan.registryChecks.excluded];
      expect(partition).toHaveLength(CHECK_REGISTRY.length);
      expect(new Set(partition.map((check) => check.id)).size).toBe(CHECK_REGISTRY.length);
      expect(partition.map((check) => check.id).toSorted()).toEqual(CHECK_REGISTRY.map((check) => check.id).toSorted());

      for (const check of partition) {
        const registered = CHECK_REGISTRY.find((candidate) => candidate.id === check.id);
        expect(registered).toBeDefined();
        expect(check).toEqual({
          id: registered?.id,
          authority: registered?.authority,
          profiles: registered?.profiles,
          contexts: registered?.contexts,
          timeoutMs: registered?.timeoutMs,
        });
      }

      const selectedStepIds = plan.steps.flatMap((step) => (step.checkId === null ? [] : [step.checkId]));
      expect(plan.registryChecks.selected.map((check) => check.id).toSorted()).toEqual(selectedStepIds.toSorted());
      expect(partition.some((check) => check.id === 'check-invariants')).toBe(false);
      expect(partition.some((check) => check.id === 'projections')).toBe(false);
      expect(partition.some((check) => check.id === 'ci-contract')).toBe(false);
    }

    expect(workspace.registryChecks.selected.some((check) => check.id === 'check/docs')).toBe(true);
    expect(staged.registryChecks.excluded.some((check) => check.id === 'check/docs')).toBe(true);
    expect(staged.registryChecks.excluded.find((check) => check.id === 'check/app-build')?.contexts).toEqual([
      'application',
    ]);

    const stagedDocs = buildLocalVerificationPlan({
      staged: true,
      changedPaths: ['packages/core/src/index.ts'],
    });
    const stagedCi = buildLocalVerificationPlan({ staged: true, changedPaths: ['.github/workflows/ci.yml'] });
    expect(stagedDocs.registryChecks.selected.some((check) => check.id === 'check/docs')).toBe(true);
    expect(stagedCi.registryChecks.selected.map((check) => check.id)).toEqual(
      staged.registryChecks.selected.map((check) => check.id),
    );
    expect(stagedCi.steps.some((step) => step.label === 'ci-contract' && step.checkId === null)).toBe(true);
  });

  test('fails closed when an excluded check vanishes or a selected check is duplicated', () => {
    const plan = buildLocalVerificationPlan({ staged: false });
    const selectedIds = plan.steps.flatMap((step) => (step.checkId === null ? [] : [step.checkId]));
    const firstSelected = plan.registryChecks.selected[0];
    expect(firstSelected).toBeDefined();
    if (firstSelected === undefined) throw new TypeError('live local verification plan selected no registry checks');

    expect(() =>
      assertLocalVerificationCheckPartition(
        {
          selected: plan.registryChecks.selected,
          excluded: plan.registryChecks.excluded.slice(1),
        },
        selectedIds,
      ),
    ).toThrow(/missing registry checks/u);
    expect(() =>
      assertLocalVerificationCheckPartition(
        {
          selected: [...plan.registryChecks.selected, firstSelected],
          excluded: plan.registryChecks.excluded,
        },
        selectedIds,
      ),
    ).toThrow(/duplicate partition check/u);
  });

  test('prints every excluded check with its live registry identity and scheduling metadata', () => {
    const plan = buildLocalVerificationPlan({ staged: true, changedPaths: ['README.md'] });
    const output = formatLocalVerificationCheckPartition(plan.registryChecks);
    for (const check of plan.registryChecks.excluded) {
      expect(output).toContain(
        `- ${check.id} authority=${check.authority} profiles=${check.profiles.join(',')} contexts=${check.contexts.join(',')} timeoutMs=${check.timeoutMs}`,
      );
    }
    expect(output.match(/^- check\//gmu)).toHaveLength(CHECK_REGISTRY.length);
  });
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import {
  CARGO_AUDIT_CI_ONLY_REASON,
  PREFLIGHT_T4_DEFAULT_MAX_MS,
  WORKFLOW_READER_FAMILIES,
  assertLocalVerificationBudgetPolicy,
  assertLocalVerificationCheckPartition,
  assertLocalVerificationDurationWithinBudget,
  buildLocalVerificationPlan,
  discoverWorkflowContractTestPaths,
  formatLocalVerificationBudgetPolicy,
  formatLocalVerificationCheckPartition,
  isCargoAuditProofInput,
  isCiContractInput,
  isTypeDocProofInput,
  localVerificationBudgetRemainingMs,
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
      'rustfmt',
      'check-invariants',
      'spine:check',
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
    // Platform is PINNED: an unpinned plan describes whichever host ran the
    // suite, and the ordered-argv expectation below would then encode one
    // machine's shape as if it were the contract.
    const plan = buildLocalVerificationPlan({ staged: false, platform: 'linux' });
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
      ['run', 'rustfmt:check'],
      ['exec', 'tsx'],
      ['run', 'spine:check'],
      ['exec', 'vitest'],
      ['exec', 'vitest'],
      ['run', 'docs:check:local'],
    ]);
  });

  test('runs command-backed ratchet authorities as commands, never as fake Vitest paths', () => {
    const plan = buildLocalVerificationPlan({ staged: false });
    expect(plan.steps.find((step) => step.label === 'test-constitution')?.argv).toEqual(['run', 'test:constitution']);
    expect(plan.steps.find((step) => step.label === 'projections')?.argv).not.toContain('test:constitution');
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
    expect(contractLaws).toHaveLength(21);

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

  test('selects the registered rustfmt receipt only for workspace or Rust authority changes', () => {
    const unrelated = buildLocalVerificationPlan({ staged: true, changedPaths: ['README.md'] });
    const rust = buildLocalVerificationPlan({
      staged: true,
      changedPaths: ['crates/liteship-compute/src/lib.rs'],
    });
    const toolchain = buildLocalVerificationPlan({ staged: true, changedPaths: ['rust-toolchain.toml'] });
    const workspace = buildLocalVerificationPlan({ staged: false });

    expect(unrelated.registryChecks.excluded.some((check) => check.id === 'check/rustfmt')).toBe(true);
    for (const plan of [rust, toolchain, workspace]) {
      expect(plan.steps).toContainEqual({
        checkId: 'check/rustfmt',
        label: 'rustfmt',
        argv: ['run', 'rustfmt:check'],
        remedy: "run 'pnpm exec tsx scripts/rustfmt-check.ts --write' with the repository toolchain, then re-run.",
      });
      expect(plan.registryChecks.selected.some((check) => check.id === 'check/rustfmt')).toBe(true);
    }
  });

  test('keeps the Rust advisory audit a CI authority on every platform, with its reason stated', () => {
    // The affected-input derivation stays live: CI still needs to know when a
    // change can move the audit verdict, even though the fast lane never runs it.
    expect(isCargoAuditProofInput('crates/liteship-compute/Cargo.lock')).toBe(true);
    expect(isCargoAuditProofInput('scripts/lib/cargo-audit-contract.ts')).toBe(true);
    expect(isCargoAuditProofInput('README.md')).toBe(false);

    // A network-resolved advisory database is not a function of the tree, and
    // the devcontainer does not provision cargo-audit. Scheduling it pre-push
    // made the mandated precommit loop unrunnable in the official container.
    expect(CARGO_AUDIT_CI_ONLY_REASON.length).toBeGreaterThan(60);

    for (const platform of ['linux', 'darwin', 'win32'] as const) {
      for (const changedPaths of [
        ['crates/liteship-compute/Cargo.lock'],
        ['package.json'],
        ['.github/workflows/ci.yml'],
      ]) {
        const staged = buildLocalVerificationPlan({ staged: true, changedPaths, platform });
        const workspace = buildLocalVerificationPlan({ staged: false, platform });
        for (const plan of [staged, workspace]) {
          expect(
            plan.steps.some((step) => step.checkId === 'check/cargo-audit'),
            `${platform} ${plan.mode} plan schedules the network-dependent Rust advisory audit`,
          ).toBe(false);
          expect(plan.registryChecks.excluded.some((check) => check.id === 'check/cargo-audit')).toBe(true);
        }
      }
    }

    // The npm-side twin this placement mirrors is CI-only for the same reason.
    const anyPlan = buildLocalVerificationPlan({ staged: false, platform: 'linux' });
    expect(anyPlan.registryChecks.excluded.some((check) => check.id === 'check/security-audit')).toBe(true);
  });

  test('THE PLATFORM LAW: the pre-push plan is the same on every host', () => {
    // A plan that differs by host is a plan whose shape assertions silently
    // describe whichever machine ran them — which is exactly how three CI jobs
    // failed on a Linux-only step while the Windows author's suite stayed green.
    const shapes = (['linux', 'darwin', 'win32'] as const).map((platform) =>
      buildLocalVerificationPlan({ staged: false, platform }).steps.map((step) => step.argv.join(' ')),
    );
    expect(shapes[1]).toEqual(shapes[0]);
    expect(shapes[2]).toEqual(shapes[0]);
  });

  test('partitions every live registry check exactly once without counting local meta steps', () => {
    const workspace = buildLocalVerificationPlan({ staged: false, platform: 'linux' });
    const staged = buildLocalVerificationPlan({ staged: true, changedPaths: ['README.md'], platform: 'linux' });

    expect(workspace.schema).toBe('liteship/local-verification-plan@3');
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

  test('derives the executable T4 budget from repeated observed required-lane timings', () => {
    const plan = buildLocalVerificationPlan({ staged: true, changedPaths: [] });

    expect(PREFLIGHT_T4_DEFAULT_MAX_MS).toBe(5 * 60 * 1_000);
    expect(plan.budget).toEqual({
      schema: 'liteship/local-preflight-budget-policy@1',
      ownerDecision: 'T4-default',
      scope: 'static-plan',
      maxDurationMs: PREFLIGHT_T4_DEFAULT_MAX_MS,
      enforcement: 'hard-timeout-fail-closed',
      evidence: {
        kind: 'observed-required-lane',
        durationsMs: [143_600, 150_700, 141_800, 149_000, 131_900],
        maxObservedDurationMs: 150_700,
        headroomMs: PREFLIGHT_T4_DEFAULT_MAX_MS - 150_700,
      },
    });
    expect(() => assertLocalVerificationBudgetPolicy(plan.budget)).not.toThrow();
    expect(formatLocalVerificationBudgetPolicy(plan.budget)).toContain(`maxDurationMs=${PREFLIGHT_T4_DEFAULT_MAX_MS}`);
    expect(formatLocalVerificationBudgetPolicy(plan.budget)).toContain('samples=5');
  });

  test('fails closed at the T4 wall boundary without dropping containment steps', () => {
    const plan = buildLocalVerificationPlan({ staged: false });

    expect(localVerificationBudgetRemainingMs(plan.budget, plan.budget.maxDurationMs - 1)).toBe(1);
    expect(() => localVerificationBudgetRemainingMs(plan.budget, plan.budget.maxDurationMs)).toThrow(
      /T4 budget exhausted/u,
    );
    expect(() => assertLocalVerificationDurationWithinBudget(plan.budget, plan.budget.maxDurationMs)).not.toThrow();
    expect(() => assertLocalVerificationDurationWithinBudget(plan.budget, plan.budget.maxDurationMs + 1)).toThrow(
      /T4 budget exceeded/u,
    );
    expect(plan.steps.map((step) => step.label)).toEqual(
      expect.arrayContaining(['check-invariants', 'projections', 'ci-contract']),
    );
  });

  test('refuses a widened owner default or drifted timing derivation', () => {
    const policy = buildLocalVerificationPlan({ staged: true, changedPaths: [] }).budget;

    expect(() =>
      assertLocalVerificationBudgetPolicy({
        ...policy,
        maxDurationMs: policy.maxDurationMs + 1,
      }),
    ).toThrow(/must equal the owner T4 default/u);
    expect(() =>
      assertLocalVerificationBudgetPolicy({
        ...policy,
        evidence: { ...policy.evidence, maxObservedDurationMs: policy.evidence.maxObservedDurationMs - 1 },
      }),
    ).toThrow(/timing evidence max drifted/u);
    expect(() =>
      assertLocalVerificationBudgetPolicy({
        ...policy,
        evidence: { ...policy.evidence, durationsMs: [] },
      }),
    ).toThrow(/requires observed timing evidence/u);
    expect(() =>
      assertLocalVerificationBudgetPolicy({
        ...policy,
        evidence: { ...policy.evidence, durationsMs: policy.evidence.durationsMs.slice(1) },
      }),
    ).toThrow(/observed required-lane census/u);
  });
});

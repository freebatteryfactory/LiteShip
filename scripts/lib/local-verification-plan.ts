/** Pure local-verification plan used by both humans and agents. @module */

import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';

export interface LocalVerificationStep {
  /** Null only for the existing gauntlet executor phase that has no registry check. */
  readonly checkId: string | null;
  readonly label: string;
  readonly argv: readonly string[];
  readonly remedy: string;
}

const INVARIANTS_STEP: LocalVerificationStep = Object.freeze({
  checkId: null,
  label: 'check-invariants',
  argv: Object.freeze(['exec', 'tsx', 'packages/cli/src/bin.ts', 'check', 'invariants']),
  remedy: 'fix the reported invariant violation, then re-run preflight',
});

export interface LocalVerificationPlan {
  readonly schema: 'liteship/local-verification-plan@1';
  readonly mode: 'workspace' | 'staged';
  readonly docsReason: 'workspace-authority' | 'staged-docs-input' | 'not-affected';
  readonly steps: readonly LocalVerificationStep[];
}

function argvForRootCheck(execution: (typeof CHECK_REGISTRY)[number]['execution']): readonly string[] {
  if (execution.kind !== 'root-script')
    throw new TypeError('repository local verification requires root-script checks');
  return Object.freeze([
    ...(execution.invocation === 'pnpm-test' ? ['test'] : ['run', execution.script]),
    ...execution.args,
  ]);
}

/** Exact blocking quick-profile projection for repository context. */
export function projectRepositoryQuickSteps(): readonly LocalVerificationStep[] {
  return Object.freeze(
    CHECK_REGISTRY.filter(
      (check) =>
        check.authority === 'blocking' && check.profiles.includes('quick') && check.contexts.includes('repository'),
    ).map((check) =>
      Object.freeze({
        checkId: check.id,
        label: check.id.slice('check/'.length),
        argv: argvForRootCheck(check.execution),
        remedy: check.remediation,
      }),
    ),
  );
}

const DOCS_STEP: LocalVerificationStep = Object.freeze({
  checkId: 'check/docs',
  label: 'docs:check',
  argv: Object.freeze(['run', 'docs:check:local']),
  remedy: "run 'pnpm run docs:build' and commit docs/api/ if the public API projection changed",
});

const DOCS_INPUT_PATTERNS: readonly RegExp[] = Object.freeze([
  /^packages\/[^/]+\/src\/.*\.ts$/u,
  /^packages\/_spine\/.*\.d\.ts$/u,
  /^scripts\/(?:gen-spine-surface|lib\/spine-surface-contract)\.ts$/u,
  /^typedoc\.json$/u,
  /^docs\/api(?:\/|$)/u,
]);

/**
 * Inputs to the CI contract: the workflow files, the plan projections, and the
 * registry they project. Editing any of these without running the parity
 * proof is how yml/registry drift reaches CI (the pr-affected reds of
 * 2026-07-25 were exactly this: a workflow edit whose parity assertions first
 * ran on the runner). Staged changes here append the complete contract suite.
 */
const CI_CONTRACT_TEST_PATHS: readonly string[] = Object.freeze([
  'tests/fuzz/cold-ci-authority-parsers-fuzz.test.ts',
  'tests/property/cold-checkout-authorities.prop.test.ts',
  'tests/property/workflow-output-contract.prop.test.ts',
  'tests/property/workflow-scanner-grammar.prop.test.ts',
  'tests/regression/cold-checkout-ci-incidents.test.ts',
  'tests/unit/cli/lib/campaign-wall-budget.test.ts',
  'tests/unit/cli/workflow-action-pins.test.ts',
  'tests/unit/devops/affected-result-artifacts.test.ts',
  'tests/unit/devops/parallel-ci-artifacts.test.ts',
  'tests/unit/devops/release-promotion.test.ts',
  'tests/unit/meta/ci-registry-parity.test.ts',
  'tests/unit/meta/workflow-output-delimiter.test.ts',
]);

const CI_CONTRACT_INPUT_PATTERNS: readonly RegExp[] = Object.freeze([
  /^\.github\/workflows\//u,
  // CI projections deliberately compose repository scripts. Selecting the
  // whole scripts ownership domain is conservative and cannot miss a newly
  // extracted helper merely because a hand-maintained filename list drifted.
  /^scripts\//u,
  /^packages\/command\/src\/checks\//u,
  /^packages\/cli\/src\/internal\/workflow-action-pins\.ts$/u,
]);

const CI_CONTRACT_STEP: LocalVerificationStep = Object.freeze({
  checkId: null,
  label: 'ci-contract',
  argv: Object.freeze(['exec', 'vitest', 'run', ...CI_CONTRACT_TEST_PATHS]),
  remedy: 'reconcile the workflow readers, registry projection, and contract laws named by the failing test',
});

function normalizeRepoPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '');
}

/** Whether a changed path can alter the committed TypeDoc projection. */
export function isTypeDocProofInput(path: string): boolean {
  const normalized = normalizeRepoPath(path);
  return DOCS_INPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Whether a changed path can drift the CI contract (workflows vs registry projection). */
export function isCiContractInput(path: string): boolean {
  const normalized = normalizeRepoPath(path);
  return (
    CI_CONTRACT_TEST_PATHS.includes(normalized) ||
    CI_CONTRACT_INPUT_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

/** Build the exact fail-fast local plan without executing any command. */
export function buildLocalVerificationPlan(input: {
  readonly staged: boolean;
  readonly changedPaths?: readonly string[];
}): LocalVerificationPlan {
  const quickSteps = projectRepositoryQuickSteps();
  const docsAffected = !input.staged || (input.changedPaths ?? []).some(isTypeDocProofInput);
  const ciContractAffected = input.staged && (input.changedPaths ?? []).some(isCiContractInput);
  const steps: LocalVerificationStep[] = [...quickSteps, INVARIANTS_STEP];
  if (ciContractAffected) steps.push(CI_CONTRACT_STEP);
  if (docsAffected) steps.push(DOCS_STEP);
  return Object.freeze({
    schema: 'liteship/local-verification-plan@1',
    mode: input.staged ? 'staged' : 'workspace',
    docsReason: !input.staged ? 'workspace-authority' : docsAffected ? 'staged-docs-input' : 'not-affected',
    steps: Object.freeze(steps),
  });
}

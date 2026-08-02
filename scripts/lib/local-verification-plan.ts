/** Live-census local-verification plan used by both humans and agents. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import { ValidationError } from '../../packages/error/src/index.js';
import { preflightEnforcerPaths } from './derived-artifacts.js';

export interface LocalVerificationStep {
  /** Null only for the existing gauntlet executor phase that has no registry check. */
  readonly checkId: string | null;
  readonly label: string;
  readonly argv: readonly string[];
  readonly remedy: string;
}

/** Registry-owned scheduling metadata exposed by the local plan complement. */
export interface LocalVerificationCheckSummary {
  readonly id: (typeof CHECK_REGISTRY)[number]['id'];
  readonly authority: (typeof CHECK_REGISTRY)[number]['authority'];
  readonly profiles: (typeof CHECK_REGISTRY)[number]['profiles'];
  readonly contexts: (typeof CHECK_REGISTRY)[number]['contexts'];
  readonly timeoutMs: (typeof CHECK_REGISTRY)[number]['timeoutMs'];
}

/** Exact disjoint partition of the live check registry for one contextual plan. */
export interface LocalVerificationCheckPartition {
  readonly selected: readonly LocalVerificationCheckSummary[];
  readonly excluded: readonly LocalVerificationCheckSummary[];
}

export const PREFLIGHT_T4_DEFAULT_MAX_MS = 5 * 60 * 1_000;

/** Executable owner policy for the default local static-plan wall budget. */
export interface LocalVerificationBudgetPolicy {
  readonly schema: 'liteship/local-preflight-budget-policy@1';
  readonly ownerDecision: 'T4-default';
  readonly scope: 'static-plan';
  readonly maxDurationMs: number;
  readonly enforcement: 'hard-timeout-fail-closed';
  readonly evidence: {
    readonly kind: 'observed-required-lane';
    readonly durationsMs: readonly number[];
    readonly maxObservedDurationMs: number;
    readonly headroomMs: number;
  };
}

/**
 * Initial W1.7 required-lane timing distribution. The first four observations
 * are the packet 1/2 staged admission + hook replays recorded in the execution
 * calibration; the fifth is packet 3's clean-head staged replay at bd251cd7.
 * All retained invariant/projection containment and ran without TypeDoc.
 */
const OBSERVED_REQUIRED_LANE_DURATIONS_MS = Object.freeze([143_600, 150_700, 141_800, 149_000, 131_900]);

/** Refuse a widened owner ruling, malformed evidence, or stale derivation. */
export function assertLocalVerificationBudgetPolicy(policy: LocalVerificationBudgetPolicy): void {
  if (policy.maxDurationMs !== PREFLIGHT_T4_DEFAULT_MAX_MS) {
    throw new TypeError(
      `local preflight maxDurationMs must equal the owner T4 default ${PREFLIGHT_T4_DEFAULT_MAX_MS}, received ${policy.maxDurationMs}`,
    );
  }
  if (
    policy.schema !== 'liteship/local-preflight-budget-policy@1' ||
    policy.ownerDecision !== 'T4-default' ||
    policy.scope !== 'static-plan' ||
    policy.enforcement !== 'hard-timeout-fail-closed'
  ) {
    throw new TypeError('local preflight budget policy identity drifted');
  }
  if (
    policy.evidence.durationsMs.length === 0 ||
    policy.evidence.durationsMs.some((durationMs) => !Number.isInteger(durationMs) || durationMs <= 0)
  ) {
    throw new TypeError('local preflight budget policy requires observed timing evidence');
  }
  if (
    policy.evidence.kind !== 'observed-required-lane' ||
    !haveSameValues(policy.evidence.durationsMs, OBSERVED_REQUIRED_LANE_DURATIONS_MS)
  ) {
    throw new TypeError('local preflight timing evidence drifted from the observed required-lane census');
  }
  const maxObservedDurationMs = Math.max(...policy.evidence.durationsMs);
  if (policy.evidence.maxObservedDurationMs !== maxObservedDurationMs) {
    throw new TypeError('local preflight timing evidence max drifted from its observed durations');
  }
  if (policy.evidence.headroomMs !== policy.maxDurationMs - maxObservedDurationMs) {
    throw new TypeError('local preflight timing evidence headroom drifted from the T4 default');
  }
  if (policy.evidence.headroomMs < 0) {
    throw new TypeError('local preflight observed required lane exceeds the owner T4 default');
  }
}

function deriveLocalVerificationBudgetPolicy(): LocalVerificationBudgetPolicy {
  const maxObservedDurationMs = Math.max(...OBSERVED_REQUIRED_LANE_DURATIONS_MS);
  const policy: LocalVerificationBudgetPolicy = Object.freeze({
    schema: 'liteship/local-preflight-budget-policy@1',
    ownerDecision: 'T4-default',
    scope: 'static-plan',
    maxDurationMs: PREFLIGHT_T4_DEFAULT_MAX_MS,
    enforcement: 'hard-timeout-fail-closed',
    evidence: Object.freeze({
      kind: 'observed-required-lane',
      durationsMs: OBSERVED_REQUIRED_LANE_DURATIONS_MS,
      maxObservedDurationMs,
      headroomMs: PREFLIGHT_T4_DEFAULT_MAX_MS - maxObservedDurationMs,
    }),
  });
  assertLocalVerificationBudgetPolicy(policy);
  return policy;
}

const LOCAL_VERIFICATION_BUDGET_POLICY = deriveLocalVerificationBudgetPolicy();

function assertElapsedMilliseconds(elapsedMs: number): void {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new TypeError(`local preflight elapsedMs must be finite and non-negative, received ${elapsedMs}`);
  }
}

/** Remaining hard child budget; zero remaining is already a red verdict. */
export function localVerificationBudgetRemainingMs(policy: LocalVerificationBudgetPolicy, elapsedMs: number): number {
  assertLocalVerificationBudgetPolicy(policy);
  assertElapsedMilliseconds(elapsedMs);
  const remainingMs = policy.maxDurationMs - elapsedMs;
  if (remainingMs <= 0) {
    throw ValidationError(
      'localVerificationBudgetRemainingMs',
      `T4 budget exhausted after ${elapsedMs}ms (maximum ${policy.maxDurationMs}ms); no remaining step may be skipped`,
    );
  }
  return remainingMs;
}

/** Equal to the ceiling is admitted; any overrun is a fail-closed red. */
export function assertLocalVerificationDurationWithinBudget(
  policy: LocalVerificationBudgetPolicy,
  elapsedMs: number,
): void {
  assertLocalVerificationBudgetPolicy(policy);
  assertElapsedMilliseconds(elapsedMs);
  if (elapsedMs > policy.maxDurationMs) {
    throw ValidationError(
      'assertLocalVerificationDurationWithinBudget',
      `T4 budget exceeded: ${elapsedMs}ms > ${policy.maxDurationMs}ms; the required lane was not green`,
    );
  }
}

/** Human projection of the same policy carried by plan JSON. */
export function formatLocalVerificationBudgetPolicy(policy: LocalVerificationBudgetPolicy): string {
  assertLocalVerificationBudgetPolicy(policy);
  return (
    `[preflight-budget] ${policy.ownerDecision} scope=${policy.scope} ` +
    `maxDurationMs=${policy.maxDurationMs} enforcement=${policy.enforcement}; ` +
    `samples=${policy.evidence.durationsMs.length} maxObservedDurationMs=${policy.evidence.maxObservedDurationMs} ` +
    `headroomMs=${policy.evidence.headroomMs}`
  );
}

const INVARIANTS_STEP: LocalVerificationStep = Object.freeze({
  checkId: null,
  label: 'check-invariants',
  argv: Object.freeze(['exec', 'tsx', 'packages/cli/src/bin.ts', 'check', 'invariants']),
  remedy: 'fix the reported invariant violation, then re-run preflight',
});

export interface LocalVerificationPlan {
  readonly schema: 'liteship/local-verification-plan@3';
  readonly mode: 'workspace' | 'staged';
  readonly docsReason: 'workspace-authority' | 'staged-docs-input' | 'not-affected';
  readonly budget: LocalVerificationBudgetPolicy;
  readonly steps: readonly LocalVerificationStep[];
  readonly registryChecks: LocalVerificationCheckPartition;
}

function summarizeRegistryCheck(check: (typeof CHECK_REGISTRY)[number]): LocalVerificationCheckSummary {
  return Object.freeze({
    id: check.id,
    authority: check.authority,
    profiles: Object.freeze([...check.profiles]),
    contexts: Object.freeze([...check.contexts]),
    timeoutMs: check.timeoutMs,
  });
}

function haveSameValues<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertSummaryMatchesRegistry(
  summary: LocalVerificationCheckSummary,
  registered: (typeof CHECK_REGISTRY)[number],
): void {
  if (
    summary.authority !== registered.authority ||
    summary.timeoutMs !== registered.timeoutMs ||
    !haveSameValues(summary.profiles, registered.profiles) ||
    !haveSameValues(summary.contexts, registered.contexts)
  ) {
    throw new TypeError(`local verification partition metadata drifted from registry check: ${summary.id}`);
  }
}

/**
 * Refuse any lossy, overlapping, or metadata-drifted registry complement.
 * Local meta steps are absent from selectedCheckIds because their checkId is null.
 */
export function assertLocalVerificationCheckPartition(
  partition: LocalVerificationCheckPartition,
  selectedCheckIds: readonly string[],
): void {
  const registryById = new Map<string, (typeof CHECK_REGISTRY)[number]>();
  for (const check of CHECK_REGISTRY) registryById.set(check.id, check);
  if (registryById.size !== CHECK_REGISTRY.length) {
    throw new TypeError('local verification partition cannot project duplicate registry check identities');
  }

  const selectedIdSet = new Set<string>();
  for (const checkId of selectedCheckIds) {
    if (selectedIdSet.has(checkId)) {
      throw new TypeError(`local verification plan selected duplicate registry check: ${checkId}`);
    }
    if (!registryById.has(checkId)) {
      throw new TypeError(`local verification plan selected an unregistered check: ${checkId}`);
    }
    selectedIdSet.add(checkId);
  }

  const seen = new Set<string>();
  const inspect = (classification: 'selected' | 'excluded', checks: readonly LocalVerificationCheckSummary[]): void => {
    for (const summary of checks) {
      if (seen.has(summary.id)) {
        throw new TypeError(`local verification partition has duplicate partition check: ${summary.id}`);
      }
      const registered = registryById.get(summary.id);
      if (registered === undefined) {
        throw new TypeError(`local verification partition contains an unregistered check: ${summary.id}`);
      }
      const expectedClassification = selectedIdSet.has(summary.id) ? 'selected' : 'excluded';
      if (classification !== expectedClassification) {
        throw new TypeError(
          `local verification partition misclassified ${summary.id}: expected ${expectedClassification}, received ${classification}`,
        );
      }
      assertSummaryMatchesRegistry(summary, registered);
      seen.add(summary.id);
    }
  };
  inspect('selected', partition.selected);
  inspect('excluded', partition.excluded);

  const missing = CHECK_REGISTRY.filter((check) => !seen.has(check.id)).map((check) => check.id);
  if (missing.length > 0) {
    throw new TypeError(`local verification partition missing registry checks: ${missing.join(', ')}`);
  }
}

function buildLocalVerificationCheckPartition(selectedCheckIds: readonly string[]): LocalVerificationCheckPartition {
  const selectedIdSet = new Set(selectedCheckIds);
  const selected: LocalVerificationCheckSummary[] = [];
  const excluded: LocalVerificationCheckSummary[] = [];
  for (const check of CHECK_REGISTRY) {
    (selectedIdSet.has(check.id) ? selected : excluded).push(summarizeRegistryCheck(check));
  }
  const partition = Object.freeze({
    selected: Object.freeze(selected),
    excluded: Object.freeze(excluded),
  });
  assertLocalVerificationCheckPartition(partition, selectedCheckIds);
  return partition;
}

function formatCheckSummary(check: LocalVerificationCheckSummary): string {
  return `- ${check.id} authority=${check.authority} profiles=${check.profiles.join(',')} contexts=${check.contexts.join(',')} timeoutMs=${check.timeoutMs}`;
}

/** Human-readable form of the same exact registry partition carried by JSON output. */
export function formatLocalVerificationCheckPartition(partition: LocalVerificationCheckPartition): string {
  return [
    `registry checks selected (${partition.selected.length})`,
    ...partition.selected.map(formatCheckSummary),
    `registry checks excluded (${partition.excluded.length})`,
    ...partition.excluded.map(formatCheckSummary),
  ].join('\n');
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
  remedy: "run 'pnpm run docs:build'; commit only the traceability fingerprint if it changed",
});

const DOCS_INPUT_PATTERNS: readonly RegExp[] = Object.freeze([
  /^packages\/[^/]+\/src\/.*\.ts$/u,
  /^packages\/_spine\/.*\.d\.ts$/u,
  /^scripts\/(?:gen-spine-surface|lib\/spine-surface-contract)\.ts$/u,
  /^typedoc\.json$/u,
  /^docs\/api(?:\/|$)/u,
]);

export interface WorkflowReaderFamily {
  readonly id: string;
  /** Repository-relative production module that owns the workflow-reading law. */
  readonly owner: string;
}

/**
 * Production owners that interpret workflow bytes or workflow-owned execution
 * policy. A test importing one of these owners is a CI-contract law. Keeping
 * the declaration at the reader boundary means new covering suites enroll by
 * import instead of waiting for another hand-maintained filename addition.
 */
export const WORKFLOW_READER_FAMILIES: readonly WorkflowReaderFamily[] = Object.freeze([
  Object.freeze({ id: 'action-pins', owner: 'packages/cli/src/internal/workflow-action-pins.ts' }),
  Object.freeze({ id: 'ci-authority', owner: 'scripts/lib/ci-authority.ts' }),
  Object.freeze({ id: 'ci-test-host', owner: 'scripts/lib/ci-test-host-contract.ts' }),
  Object.freeze({ id: 'prebuild-closure', owner: 'scripts/lib/prebuild-closure-contract.ts' }),
  Object.freeze({ id: 'release-promotion', owner: 'scripts/lib/release-promotion-contract.ts' }),
  Object.freeze({ id: 'supply-chain', owner: 'packages/cli/src/internal/supply-chain.ts' }),
  Object.freeze({ id: 'workflow-output', owner: 'scripts/lib/workflow-output-contract.ts' }),
]);

const IMPORT_SPECIFIER = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/gu;

/** Classify the declared workflow-reader families imported by test source. */
export function workflowReaderFamiliesCoveredByTestSource(source: string): readonly string[] {
  const specifiers = [...source.matchAll(IMPORT_SPECIFIER)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
  return Object.freeze(
    WORKFLOW_READER_FAMILIES.filter((family) => {
      const runtimeOwner = family.owner.replace(/\.ts$/u, '.js');
      return specifiers.some((specifier) => specifier.endsWith(runtimeOwner));
    }).map((family) => family.id),
  );
}

/** Derive every live law that directly covers a declared workflow reader. */
export function discoverWorkflowContractTestPaths(repoRoot: string): readonly string[] {
  const coveredFamilies = new Set<string>();
  const paths = fg
    .sync('tests/**/*.test.ts', { cwd: repoRoot, onlyFiles: true })
    .filter((path) => {
      const families = workflowReaderFamiliesCoveredByTestSource(readFileSync(resolve(repoRoot, path), 'utf8'));
      for (const family of families) coveredFamilies.add(family);
      return families.length > 0;
    })
    .sort();
  if (paths.length === 0) throw new TypeError('workflow-contract law census discovered zero covering tests');
  const missingFamilies = WORKFLOW_READER_FAMILIES.filter((family) => !coveredFamilies.has(family.id));
  if (missingFamilies.length > 0) {
    throw new TypeError(
      `workflow-contract law census has no covering test for declared reader families: ${missingFamilies
        .map((family) => family.id)
        .join(', ')}`,
    );
  }
  return Object.freeze(paths);
}

/**
 * Inputs to the CI contract: the workflow files, the plan projections, and the
 * registry they project. Editing any of these without running the parity
 * proof is how yml/registry drift reaches CI (the pr-affected reds of
 * 2026-07-25 were exactly this: a workflow edit whose parity assertions first
 * ran on the runner). Workspace mode always carries the complete suite; staged
 * mode appends it only when one of these inputs is affected.
 */
const CI_CONTRACT_TEST_PATHS = discoverWorkflowContractTestPaths(resolve(import.meta.dirname, '../..'));

/** The deterministic live CI-contract law census used by the local plan. */
export function workflowContractTestPaths(): readonly string[] {
  return CI_CONTRACT_TEST_PATHS;
}

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

/**
 * The drift authorities for every committed derivable artifact the fast lane
 * owns — derived from the registry, never restated, so adding an artifact
 * cannot leave the pre-push lane behind. CI enforces these; before this step
 * existed, preflight did not, and a green local gate shipped drift that
 * failed nine CI jobs.
 */
const PROJECTIONS_STEP: LocalVerificationStep = Object.freeze({
  checkId: null,
  label: 'projections',
  argv: Object.freeze(['exec', 'vitest', 'run', ...preflightEnforcerPaths()]),
  remedy: "run 'pnpm run regen' and commit the regenerated projections",
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
  const ciContractAffected = !input.staged || (input.changedPaths ?? []).some(isCiContractInput);
  const steps: LocalVerificationStep[] = [...quickSteps, INVARIANTS_STEP, PROJECTIONS_STEP];
  if (ciContractAffected) steps.push(CI_CONTRACT_STEP);
  if (docsAffected) steps.push(DOCS_STEP);
  const selectedCheckIds = steps.flatMap((step) => (step.checkId === null ? [] : [step.checkId]));
  return Object.freeze({
    schema: 'liteship/local-verification-plan@3',
    mode: input.staged ? 'staged' : 'workspace',
    docsReason: !input.staged ? 'workspace-authority' : docsAffected ? 'staged-docs-input' : 'not-affected',
    budget: LOCAL_VERIFICATION_BUDGET_POLICY,
    steps: Object.freeze(steps),
    registryChecks: buildLocalVerificationCheckPartition(selectedCheckIds),
  });
}

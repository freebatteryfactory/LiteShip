/** Event-specific GitHub authority job requirements folded by delivery evidence admission. @module */

import type { DeliveryCiEvent } from './ci-evidence-selection.js';
import {
  activeLinesOf,
  childIndicesOf,
  stepIndicesOf,
  stepRunCommandOf,
  unreadableYamlViolations,
  workflowJobSections,
} from '../../packages/cli/src/internal/workflow-action-pins.js';

export interface CiAuthorityInput {
  readonly event: DeliveryCiEvent;
  readonly ref: string;
  readonly browserAffected: boolean;
  readonly rustWasmAffected: boolean;
}

// The FOLD jobs carry the exhaustive authority — matrix shards are builders
// whose red is EXPECTED while the verdict bank converges, and `jobNameMatches`
// would match a bare `exhaustive-mutation` id against every shard.
const EXHAUSTIVE = [
  'exhaustive-analysis',
  'exhaustive-mutation-fold',
  'exhaustive-mcdc-fold',
  'semantic-assurance-admission',
] as const;

/** Release claims that must be proven before merge and reproduced after merge. */
const RELEASE_CANDIDATE = [
  'format',
  'truth-linux-parallel',
  'browser-e2e',
  'windows-smoke',
  'macos-smoke',
  'macos-browser',
  'rust-wasm-parity',
  'security-audit',
] as const;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

/** Exact workflow job ids whose successful conclusions establish the event's CI authority. */
export function requiredAuthorityJobs(input: CiAuthorityInput): readonly string[] {
  if (input.event === 'pull_request') {
    return uniqueSorted([
      ...RELEASE_CANDIDATE,
      'pr-affected',
      'pr-affected-evidence',
      'pr-windows-affected',
      ...(input.browserAffected ? ['pr-browser-affected'] : []),
    ]);
  }
  const exhaustive =
    input.event === 'schedule' || input.event === 'workflow_dispatch' || input.ref.startsWith('refs/tags/v');
  if (input.event === 'schedule' || input.event === 'workflow_dispatch') {
    return uniqueSorted([
      'format',
      'truth-linux',
      'browser-e2e',
      'windows-smoke',
      'macos-smoke',
      'macos-browser',
      'rust-wasm-parity',
      'security-audit',
      ...(exhaustive ? EXHAUSTIVE : []),
    ]);
  }
  return uniqueSorted([...RELEASE_CANDIDATE, ...(exhaustive ? EXHAUSTIVE : [])]);
}

interface CiSummaryEnvironment {
  readonly statusJobs: ReadonlyMap<string, string>;
  readonly controls: ReadonlySet<'BROWSER_REQUIRED' | 'EVENT' | 'REF'>;
}

function ciSummaryEnvironment(section: string): CiSummaryEnvironment {
  const lines = activeLinesOf(section);
  const runSteps = stepIndicesOf(lines).filter((step) => stepRunCommandOf(lines, step).length > 0);
  if (runSteps.length !== 1) {
    throw new TypeError(`ci-summary must declare exactly one run step, received ${runSteps.length}`);
  }
  const step = runSteps[0]!;
  const env = childIndicesOf(lines, step).find((index) => lines[index]!.body === 'env:');
  if (env === undefined) throw new TypeError('ci-summary run step must declare env');
  const bindings = new Map<string, string>();
  const controls = new Set<'BROWSER_REQUIRED' | 'EVENT' | 'REF'>();
  for (const index of childIndicesOf(lines, env)) {
    const body = lines[index]!.body;
    const match = /^([A-Z][A-Z0-9_]*):\s+\$\{\{\s*needs\.([A-Za-z0-9_-]+)\.result\s*\}\}$/u.exec(body);
    if (match !== null) {
      const variable = match[1]!;
      const job = match[2]!;
      if (bindings.has(variable)) throw new TypeError(`ci-summary declares duplicate environment binding ${variable}`);
      if ([...bindings.values()].includes(job)) throw new TypeError(`ci-summary binds job ${job} more than once`);
      bindings.set(variable, job);
      continue;
    }
    const control =
      body === 'EVENT: ${{ github.event_name }}'
        ? 'EVENT'
        : body === 'REF: ${{ github.ref }}'
          ? 'REF'
          : body === 'BROWSER_REQUIRED: ${{ needs.plan.outputs.affected-browser-required }}'
            ? 'BROWSER_REQUIRED'
            : null;
    if (control === null) throw new TypeError(`ci-summary contains an unclassified environment binding: ${body}`);
    if (controls.has(control)) throw new TypeError(`ci-summary declares duplicate environment binding ${control}`);
    controls.add(control);
  }
  return { statusJobs: bindings, controls };
}

interface ShellBranch {
  readonly parentActive: boolean;
  readonly predicate: boolean;
  elseSeen: boolean;
}

function branchPredicate(
  line: string,
  input: CiAuthorityInput,
  controls: ReadonlySet<'BROWSER_REQUIRED' | 'EVENT' | 'REF'>,
): boolean | null {
  if (line === 'if [ "$EVENT" = "pull_request" ]; then') {
    if (!controls.has('EVENT')) throw new TypeError('ci-summary EVENT predicate has no exact event-name binding');
    return input.event === 'pull_request';
  }
  if (line === 'if [ "$BROWSER_REQUIRED" = "true" ]; then') {
    if (!controls.has('BROWSER_REQUIRED')) {
      throw new TypeError('ci-summary BROWSER_REQUIRED predicate has no exact affected-plan binding');
    }
    return input.browserAffected;
  }
  if (line === 'if [ "$EVENT" = "schedule" ] || [ "$EVENT" = "workflow_dispatch" ]; then') {
    if (!controls.has('EVENT')) throw new TypeError('ci-summary EVENT predicate has no exact event-name binding');
    return input.event === 'schedule' || input.event === 'workflow_dispatch';
  }
  if (
    line === 'if [ "$EVENT" = "schedule" ] || [ "$EVENT" = "workflow_dispatch" ] || [[ "$REF" == refs/tags/v* ]]; then'
  ) {
    if (!controls.has('EVENT') || !controls.has('REF')) {
      throw new TypeError('ci-summary exhaustive predicate has no exact event/ref binding');
    }
    return input.event === 'schedule' || input.event === 'workflow_dispatch' || input.ref.startsWith('refs/tags/v');
  }
  return null;
}

/**
 * Successful jobs independently folded by `ci-summary` for one event.
 *
 * THE CLASS RULE — ANCHOR: every shell status assertion in the summary's
 * single run step. ALLOWLIST: a structurally-bound `needs.<job>.result`
 * variable inside the closed event/ref predicates interpreted below. An
 * unknown predicate, status spelling, or unbound variable is a refusal,
 * never an omitted job, because omission would let the shell and evidence
 * admission define different merge authority without either side redding.
 */
export function ciSummarySuccessfulJobs(workflowSource: string, input: CiAuthorityInput): readonly string[] {
  const unreadable = unreadableYamlViolations(workflowSource);
  if (unreadable.length > 0) throw new TypeError(`ci-summary workflow is unreadable: ${unreadable.join('; ')}`);
  const section = workflowJobSections(workflowSource).get('ci-summary');
  if (section === undefined) throw new TypeError('workflow must declare ci-summary');
  const environment = ciSummaryEnvironment(section);
  const bindings = environment.statusJobs;
  const lines = activeLinesOf(section);
  const runSteps = stepIndicesOf(lines).filter((step) => stepRunCommandOf(lines, step).length > 0);
  const command = stepRunCommandOf(lines, runSteps[0]!);
  const jobs: string[] = [];
  const branches: ShellBranch[] = [];
  let active = true;
  for (const raw of command.split('\n')) {
    const line = raw.trim().replace(/\s+/gu, ' ');
    if (line.length === 0 || line === 'set -euo pipefail' || line.startsWith('echo ')) continue;
    const predicate = branchPredicate(line, input, environment.controls);
    if (predicate !== null) {
      branches.push({ parentActive: active, predicate, elseSeen: false });
      active = active && predicate;
      continue;
    }
    if (line === 'else') {
      const branch = branches.at(-1);
      if (branch === undefined || branch.elseSeen) throw new TypeError('ci-summary contains an unmatched else');
      branch.elseSeen = true;
      active = branch.parentActive && !branch.predicate;
      continue;
    }
    if (line === 'fi') {
      const branch = branches.pop();
      if (branch === undefined) throw new TypeError('ci-summary contains an unmatched fi');
      active = branch.parentActive;
      continue;
    }
    if (line.startsWith('if ')) throw new TypeError(`ci-summary contains an unclassified authority predicate: ${line}`);

    const success = /^test "\$([A-Z][A-Z0-9_]*)" = "success"$/u.exec(line);
    if (success !== null) {
      const job = bindings.get(success[1]!);
      if (job === undefined) throw new TypeError(`ci-summary tests unbound status variable ${success[1]}`);
      if (active) jobs.push(job);
      continue;
    }
    const skipped = /^test "\$([A-Z][A-Z0-9_]*)" = "skipped"$/u.exec(line);
    if (skipped !== null) {
      if (!bindings.has(skipped[1]!)) throw new TypeError(`ci-summary tests unbound status variable ${skipped[1]}`);
      continue;
    }
    throw new TypeError(`ci-summary contains an unclassified command: ${line}`);
  }
  if (branches.length > 0) throw new TypeError('ci-summary contains an unterminated authority predicate');
  return uniqueSorted(jobs);
}

/** Set-difference findings between the shell fold and evidence authority for one event. */
export function ciSummaryAuthorityParityViolations(workflowSource: string, input: CiAuthorityInput): readonly string[] {
  // `evidence-admission` is the independent verifier of the authority receipt,
  // not a member of the receipt it verifies. It is the sole intentional extra
  // successful job in the final shell fold; everything else must be identical.
  const expected = uniqueSorted([...requiredAuthorityJobs(input), 'evidence-admission']);
  const actual = ciSummarySuccessfulJobs(workflowSource, input);
  return Object.freeze([
    ...expected.filter((job) => !actual.includes(job)).map((job) => `ci-summary is missing required authority ${job}`),
    ...actual.filter((job) => !expected.includes(job)).map((job) => `ci-summary has unbound authority ${job}`),
  ]);
}

function workflowJobNeeds(workflowSource: string, job: string): readonly string[] {
  const section = workflowJobSections(workflowSource).get(job);
  if (section === undefined) throw new TypeError(`workflow must declare ${job}`);
  const lines = activeLinesOf(section);
  const needs = childIndicesOf(lines, 0).find((index) => lines[index]!.body === 'needs:');
  if (needs === undefined) throw new TypeError(`${job} must declare needs as a block sequence`);
  return Object.freeze(
    childIndicesOf(lines, needs).map((index) => {
      const match = /^- ([A-Za-z0-9_-]+)$/u.exec(lines[index]!.body);
      if (match === null) throw new TypeError(`${job} contains an unclassified needs entry: ${lines[index]!.body}`);
      return match[1]!;
    }),
  );
}

/**
 * Whole-workflow authority parity: the final fold and evidence collector both
 * wait for every event-specific authority owner. This closes the timing
 * sibling of list drift—a newly required job cannot be queried by the
 * collector before GitHub has completed it.
 */
export function ciAuthorityWorkflowParityViolations(
  workflowSource: string,
  input: CiAuthorityInput,
): readonly string[] {
  const violations = [...ciSummaryAuthorityParityViolations(workflowSource, input)];
  const expectedSummary = uniqueSorted([...requiredAuthorityJobs(input), 'evidence-admission']);
  const summaryNeeds = workflowJobNeeds(workflowSource, 'ci-summary');
  const collectorNeeds = workflowJobNeeds(workflowSource, 'delivery-evidence-collect');
  for (const job of expectedSummary) {
    if (!summaryNeeds.includes(job)) violations.push(`ci-summary does not wait for authority ${job}`);
  }
  for (const job of requiredAuthorityJobs(input)) {
    if (!collectorNeeds.includes(job)) violations.push(`delivery-evidence-collect does not wait for authority ${job}`);
  }
  return Object.freeze(violations);
}

/** Pure mapping from the addressed affected plan and CI registry projection to evidence-producing jobs. @module */

import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import {
  projectCheckEvidenceRequirements,
  type CheckEvidenceManifestRequirement,
} from '../../packages/command/src/checks/evidence-requirements.js';
import type { AffectedTestPlan } from './affected-test-plan.js';
import { buildCiPlan } from '../ci-plan.js';

export type DeliveryCiEvent = 'pull_request' | 'push' | 'schedule' | 'workflow_dispatch' | 'workflow_call';

export interface SelectedCheckEvidence {
  readonly requirement: CheckEvidenceManifestRequirement;
  readonly jobNames: readonly string[];
  readonly platforms: readonly string[];
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function releaseCheckIds(): readonly string[] {
  return CHECK_REGISTRY.filter((check) => check.contexts.includes('repository') && check.profiles.includes('release'))
    .map((check) => check.id)
    .sort(codeUnitCompare);
}

function pushOwners(): ReadonlyMap<string, readonly string[]> {
  const plan = buildCiPlan();
  const owners = new Map<string, string[]>();
  const add = (checkId: string, job: string): void => {
    const current = owners.get(checkId) ?? [];
    if (!current.includes(job)) current.push(job);
    owners.set(checkId, current);
  };
  for (const receipt of plan.executionReceipts) add(receipt.checkId, receipt.job);

  // Registry checks that participate in cross-platform authority retain their
  // canonical Linux owner and additionally require the platform proof jobs.
  add('check/test', 'windows-smoke');
  add('check/test-e2e', 'browser-e2e');
  return new Map(
    [...owners.entries()].map(([checkId, jobs]) => [checkId, Object.freeze([...jobs].sort(codeUnitCompare))]),
  );
}

function prOwners(checkId: string): readonly string[] {
  if (checkId === 'check/format') return ['format'];
  if (checkId === 'check/rustfmt' || checkId === 'check/rust-wasm-qualification') return ['rust-wasm-parity'];
  if (checkId === 'check/cargo-audit') return ['security-audit'];
  if (checkId === 'check/test-e2e') return ['pr-browser-affected'];
  if (checkId === 'check/test') return ['pr-affected', 'pr-windows-affected'];
  return ['pr-affected'];
}

function broadOwners(checkId: string): readonly string[] {
  if (checkId === 'check/format') return ['format'];
  if (checkId === 'check/rustfmt' || checkId === 'check/rust-wasm-qualification') return ['rust-wasm-parity'];
  if (checkId === 'check/cargo-audit') return ['security-audit'];
  return ['truth-linux'];
}

function platformsFor(jobs: readonly string[]): readonly string[] {
  const values = new Set<string>();
  for (const job of jobs) {
    if (job.includes('windows')) values.add('win32');
    else if (job.includes('browser')) values.add('browser');
    else values.add('linux');
  }
  return Object.freeze([...values].sort(codeUnitCompare));
}

/** Select the exact registry requirements and CI jobs that must satisfy them for this event. */
export function selectCheckEvidence(
  affectedPlan: AffectedTestPlan,
  event: DeliveryCiEvent,
): readonly SelectedCheckEvidence[] {
  const requirementByCheck = new Map(
    projectCheckEvidenceRequirements(CHECK_REGISTRY).map((requirement) => [requirement.checkId, requirement] as const),
  );
  const ids = event === 'pull_request' ? [...affectedPlan.requiredChecks] : [...releaseCheckIds()];
  const push = event === 'push' || event === 'workflow_call' ? pushOwners() : null;
  return Object.freeze(
    ids.sort(codeUnitCompare).map((checkId) => {
      const requirement = requirementByCheck.get(checkId);
      if (requirement === undefined) throw new TypeError(`no evidence requirement exists for ${checkId}`);
      const jobs = event === 'pull_request' ? prOwners(checkId) : (push?.get(checkId) ?? broadOwners(checkId));
      if (jobs.length === 0) throw new TypeError(`no CI evidence producer exists for ${checkId} during ${event}`);
      return Object.freeze({ requirement, jobNames: Object.freeze([...jobs]), platforms: platformsFor(jobs) });
    }),
  );
}

/** Match a GitHub matrix job name to its stable workflow job id. */
export function jobNameMatches(actual: string, expected: string): boolean {
  const leaf = actual.split(' / ').at(-1) ?? actual;
  return leaf === expected || leaf.startsWith(`${expected} (`);
}

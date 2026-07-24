/**
 * Clean-checkout affected-plan host.
 *
 * This entrypoint deliberately imports no built workspace package and no shared
 * CLI spawn helper: the CI plan job executes before `pnpm build`. It writes the
 * GitHub output itself so a failed planner cannot be laundered by `echo $(...)`.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_CATALOG } from './package-catalog.js';
import { buildAssuranceInventory } from './lib/assurance-inventory.js';
import { parseAffectedTestPlan, planAffectedTests, type AffectedTestPlan } from './lib/affected-test-plan.js';

export interface ChangedPathRead {
  readonly paths: readonly string[];
  readonly baseSha: string;
  readonly headSha: string;
  readonly degradedReason?: string;
}

export type GitDiffReader = (cwd: string, base: string) => ChangedPathRead;

/** Read one Git object id for plan-to-checkout binding. */
export function readGitSha(cwd: string, ref: string): string {
  return execFileSync('git', ['rev-parse', ref], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** Read the review diff. An unavailable base selects full authority rather than a partial guess. */
export const readChangedPaths: GitDiffReader = (cwd, base) => {
  try {
    const baseSha = readGitSha(cwd, base);
    const headSha = readGitSha(cwd, 'HEAD');
    const stdout = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { paths: stdout.split(/\r?\n/u).filter(Boolean), baseSha, headSha };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      paths: ['package.json'],
      baseSha: 'unresolved',
      headSha: 'unresolved',
      degradedReason: `git diff unavailable; selected full authority: ${message}`,
    };
  }
};

/** Produce and boundary-validate the plan before another process may consume it. */
export function createAffectedPlan(
  cwd: string,
  base: string,
  readDiff: GitDiffReader = readChangedPaths,
  selectorErrorBudgetRemaining = 1,
): AffectedTestPlan {
  const changed = readDiff(cwd, base);
  return parseAffectedTestPlan(
    planAffectedTests(changed.paths, PACKAGE_CATALOG, buildAssuranceInventory(cwd), {
      baseRef: base,
      baseSha: changed.baseSha,
      headSha: changed.headSha,
      confidence: changed.degradedReason === undefined ? 'high' : 'low',
      selectorErrorBudgetRemaining,
      ...(changed.degradedReason === undefined ? {} : { rationale: [changed.degradedReason] }),
    }),
  );
}

/** Append one validated compact JSON output. Writing happens only after validation succeeds. */
export function writeAffectedGithubOutput(path: string, plan: AffectedTestPlan): void {
  const validated = parseAffectedTestPlan(plan);
  appendFileSync(path, `plan=${JSON.stringify(validated)}\n`, 'utf8');
}

/** Atomically persist and read-back validate the exact plan bytes handed to downstream jobs. */
export function writeAffectedPlanFile(path: string, plan: AffectedTestPlan): void {
  const validated = parseAffectedTestPlan(plan);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(validated)}\n`, 'utf8');
  const readBack = parseAffectedTestPlan(JSON.parse(readFileSync(temporary, 'utf8')) as unknown);
  if (readBack.planId !== validated.planId) throw new TypeError('affected plan file changed during write');
  renameSync(temporary, path);
}

/** Refuse a valid plan addressed to any checkout other than the one executing it. */
export function assertAffectedPlanHead(plan: AffectedTestPlan, headSha: string): void {
  if (plan.headSha !== headSha) {
    throw new TypeError(`affected plan head ${plan.headSha} does not match checkout ${headSha}`);
  }
}

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${name} requires a value`);
  return value;
}

export function main(argv: readonly string[] = process.argv.slice(2)): void {
  const cwd = process.cwd();
  if (argv.includes('--verify-current-head')) {
    const raw = process.env['LITESHIP_AFFECTED_PLAN'];
    if (raw === undefined) throw new TypeError('LITESHIP_AFFECTED_PLAN is required for verification');
    const supplied = parseAffectedTestPlan(JSON.parse(raw) as unknown);
    assertAffectedPlanHead(supplied, readGitSha(cwd, 'HEAD'));
    process.stdout.write(`${supplied.planId}\n`);
    return;
  }
  const base = process.env['LITESHIP_AFFECTED_BASE'] || 'origin/main';
  const rawBudget = process.env['LITESHIP_SELECTOR_ERROR_BUDGET_REMAINING'] ?? '1';
  const selectorErrorBudgetRemaining = Number(rawBudget);
  if (!Number.isSafeInteger(selectorErrorBudgetRemaining) || selectorErrorBudgetRemaining < 0) {
    throw new TypeError('LITESHIP_SELECTOR_ERROR_BUDGET_REMAINING must be a non-negative integer');
  }
  const plan = createAffectedPlan(cwd, base, readChangedPaths, selectorErrorBudgetRemaining);
  const output = optionValue(argv, '--github-output');
  const file = optionValue(argv, '--output');
  if (file !== undefined) writeAffectedPlanFile(file, plan);
  if (output !== undefined) writeAffectedGithubOutput(output, plan);
  if (output === undefined) process.stdout.write(`${JSON.stringify(plan)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();

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
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PACKAGE_CATALOG } from './package-catalog.js';
import { buildAssuranceInventory } from './lib/assurance-inventory.js';
import { parseAffectedTestPlan, planAffectedTests, type AffectedTestPlan } from './lib/affected-test-plan.js';

export interface ChangedPathRead {
  readonly paths: readonly string[];
  readonly degradedReason?: string;
}

export type GitDiffReader = (cwd: string, base: string) => ChangedPathRead;

/** Read the review diff. An unavailable base selects full authority rather than a partial guess. */
export const readChangedPaths: GitDiffReader = (cwd, base) => {
  try {
    const stdout = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { paths: stdout.split(/\r?\n/u).filter(Boolean) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      paths: ['package.json'],
      degradedReason: `git diff unavailable; selected full authority: ${message}`,
    };
  }
};

/** Produce and boundary-validate the plan before another process may consume it. */
export function createAffectedPlan(
  cwd: string,
  base: string,
  readDiff: GitDiffReader = readChangedPaths,
): AffectedTestPlan {
  const changed = readDiff(cwd, base);
  const selected = planAffectedTests(changed.paths, PACKAGE_CATALOG, buildAssuranceInventory(cwd));
  const plan = changed.degradedReason === undefined ? selected : { ...selected, reason: changed.degradedReason };
  return parseAffectedTestPlan(plan);
}

/** Append one validated compact JSON output. Writing happens only after validation succeeds. */
export function writeAffectedGithubOutput(path: string, plan: AffectedTestPlan): void {
  const validated = parseAffectedTestPlan(plan);
  appendFileSync(path, `plan=${JSON.stringify(validated)}\n`, 'utf8');
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
  const base = process.env['LITESHIP_AFFECTED_BASE'] ?? 'origin/main';
  const plan = createAffectedPlan(cwd, base);
  const output = optionValue(argv, '--github-output');
  if (output !== undefined) writeAffectedGithubOutput(output, plan);
  else process.stdout.write(`${JSON.stringify(plan)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();

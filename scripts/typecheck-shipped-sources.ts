#!/usr/bin/env tsx
/** Run context-correct TypeScript admission for every shipped fragment and bin. @module */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationError } from '../packages/error/src/index.js';
import { spawnArgvVisible } from '../packages/command/src/host/launcher.js';
import { isDirectExecution } from './audit/shared.js';
import { readCliFragmentProjectionAuthority } from './gen-cli-fragments.js';
import {
  buildShippedSourceTypecheckPlan,
  collectShippedFragmentProjectionViolations,
  collectShippedTypecheckConfigViolations,
  readRepoBytes,
} from './lib/shipped-source-typecheck.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

export async function main(): Promise<number> {
  const authority = await readCliFragmentProjectionAuthority(REPO_ROOT);
  const readBytes = readRepoBytes(REPO_ROOT);
  const projectionViolations = collectShippedFragmentProjectionViolations(authority, readBytes);
  if (projectionViolations.length > 0) {
    throw ValidationError('shipped-source-typecheck', projectionViolations.join('; '));
  }
  const plan = buildShippedSourceTypecheckPlan(authority, readBytes);
  const violations = collectShippedTypecheckConfigViolations(plan, REPO_ROOT);
  if (violations.length > 0) throw ValidationError('shipped-source-typecheck', violations.join('; '));

  for (const context of plan.contexts) {
    process.stdout.write(
      `[typecheck:shipped] ${context.id}: ${context.subjects.length} subject(s) via ${context.configPath}\n`,
    );
    const result = await spawnArgvVisible(
      'pnpm',
      ['exec', 'tsx', 'scripts/native-tsc.ts', '--', '--noEmit', '--project', context.configPath],
      { cwd: REPO_ROOT },
    );
    if (result.exitCode !== 0) return result.exitCode;
  }
  process.stdout.write(
    `[typecheck:shipped] admitted ${plan.fragmentSources.length} fragment sources and ${plan.shippedBins.length} bins.\n`,
  );
  return 0;
}

if (isDirectExecution(import.meta.url)) {
  void main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}

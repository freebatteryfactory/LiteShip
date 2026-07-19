import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { runPnpm } from './support/pnpm-process.js';
import { FLAKE_BROWSER_TARGETS, FLAKE_NODE_TARGETS } from './test-flake-targets.js';

const root = resolve(import.meta.dirname, '..');

const repetitions = 5;
const browserFlakeEnv = {
  LITESHIP_VITEST_BROWSERS: process.env.LITESHIP_VITEST_BROWSERS ?? 'chromium',
};

async function assertTargetsExist(label: string, targets: readonly string[]): Promise<void> {
  const missing: string[] = [];
  for (const rel of targets) {
    try {
      await stat(resolve(root, rel));
    } catch {
      missing.push(rel);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[flake] ${label}: ${missing.length} target(s) missing on disk — vitest silently skips missing paths when mixed with valid ones. Missing: ${missing.join(', ')}`,
    );
  }
}

async function runSuite(
  label: string,
  args: readonly string[],
  options?: { readonly env?: NodeJS.ProcessEnv },
): Promise<void> {
  for (let iteration = 1; iteration <= repetitions; iteration++) {
    console.log(`[flake] ${label} iteration ${iteration}/${repetitions}`);
    const result = await runPnpm(args, { cwd: root, env: options?.env });
    if (result.code !== 0) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      throw new Error(`${label} flake pass failed on iteration ${iteration}.`);
    }
  }
}

await assertTargetsExist('node runtime-sensitive tests', FLAKE_NODE_TARGETS);
await runSuite('node runtime-sensitive tests', [
  'exec',
  'vitest',
  'run',
  '--config',
  'vitest.config.ts',
  ...FLAKE_NODE_TARGETS,
]);
await assertTargetsExist('browser runtime-sensitive tests', FLAKE_BROWSER_TARGETS);
await runSuite(
  'browser runtime-sensitive tests',
  [
    'exec',
    'vitest',
    'run',
    '--config',
    'vitest.browser.config.ts',
    ...FLAKE_BROWSER_TARGETS,
  ],
  {
    env: browserFlakeEnv,
  },
);

console.log('[flake] all runtime-sensitive repetitions passed cleanly.');

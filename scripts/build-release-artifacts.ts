/** Build the immutable tarball set consumed by release verification and publish. */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReleaseArtifactBundle } from '../packages/cli/src/lib/release-artifact-bundle.js';
import { parseAffectedTestPlan } from './lib/affected-test-plan.js';
import { spawnArgvCapture } from './lib/spawn.js';

async function commandOutput(command: string, argv: readonly string[], cwd: string): Promise<string> {
  const result = await spawnArgvCapture(command, argv, { cwd });
  if (result.exitCode !== 0) {
    throw new Error(`${command} ${argv.join(' ')} failed (exit ${result.exitCode}): ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

const root = process.cwd();
const outputArg = process.argv[2] ?? 'release-artifacts/tarballs';
const planArg = process.argv[3] ?? '.liteship/affected-plan.json';
const sourceCommit = await commandOutput('git', ['rev-parse', 'HEAD'], root);
const plan = parseAffectedTestPlan(JSON.parse(readFileSync(resolve(root, planArg), 'utf8')) as unknown);
const pnpm = await commandOutput('pnpm', ['--version'], root);
const manifest = await buildReleaseArtifactBundle({
  root,
  outputDir: resolve(root, outputArg),
  sourceCommit,
  planId: plan.planId,
  builder: {
    workflow: process.env['GITHUB_WORKFLOW'] ?? 'local',
    runId: process.env['GITHUB_RUN_ID'] ?? 'local',
    runAttempt: process.env['GITHUB_RUN_ATTEMPT'] ?? '1',
    platform: `${process.platform}-${process.arch}`,
    node: process.version,
    pnpm,
  },
});
process.stdout.write(`${JSON.stringify(manifest)}\n`);

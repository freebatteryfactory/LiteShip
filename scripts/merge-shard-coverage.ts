/**
 * Merge vitest shard coverage fragments into `coverage/node/coverage-final.json`.
 *
 * Used by the parallel truth-linux lane: each test-shard job writes
 * `coverage/node-shard-<n>/coverage-final.json` plus optional subprocess dumps under
 * `coverage/subprocess-raw-shard/<n>/`. This script unions the shard maps, stages
 * subprocess dumps into `coverage/subprocess-raw/`, then delegates to the existing
 * merge-subprocess-v8 + merge-coverage pipeline.
 *
 * @module
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import libCoverage from 'istanbul-lib-coverage';
import { spawnArgvVisible } from './lib/spawn.js';
import { repoRoot } from '../vitest.shared.js';

const { createCoverageMap } = libCoverage;

const coverageRoot = resolve(repoRoot, 'coverage');
const nodeCoveragePath = resolve(coverageRoot, 'node', 'coverage-final.json');
const subprocessTargetDir = resolve(coverageRoot, 'subprocess-raw');

function discoverShardCoverageDirs(): string[] {
  if (!existsSync(coverageRoot)) return [];
  return readdirSync(coverageRoot)
    .filter((name) => /^node-shard-\d+$/.test(name))
    .map((name) => resolve(coverageRoot, name))
    .filter((dir) => existsSync(resolve(dir, 'coverage-final.json')));
}

function discoverSubprocessShardDirs(): string[] {
  if (!existsSync(coverageRoot)) return [];
  const nested = resolve(coverageRoot, 'subprocess-raw-shard');
  const dirs: string[] = [];
  if (existsSync(nested)) {
    for (const name of readdirSync(nested)) {
      const dir = resolve(nested, name);
      if (existsSync(dir)) dirs.push(dir);
    }
  }
  return dirs;
}

function stageSubprocessDumps(): number {
  const shardDirs = discoverSubprocessShardDirs();
  if (shardDirs.length === 0) return 0;
  mkdirSync(subprocessTargetDir, { recursive: true });
  let staged = 0;
  for (const shardDir of shardDirs) {
    for (const file of readdirSync(shardDir)) {
      if (!file.startsWith('coverage-') || !file.endsWith('.json')) continue;
      const source = resolve(shardDir, file);
      const target = resolve(subprocessTargetDir, `${basename(shardDir)}-${file}`);
      copyFileSync(source, target);
      staged++;
    }
  }
  return staged;
}

function mergeShardCoverage(): void {
  const shardDirs = discoverShardCoverageDirs();
  if (shardDirs.length === 0) {
    throw new Error(
      'No shard coverage directories found (expected coverage/node-shard-<n>/coverage-final.json)',
    );
  }

  const merged = createCoverageMap({});
  for (const shardDir of shardDirs.sort()) {
    const shardPath = resolve(shardDir, 'coverage-final.json');
    merged.merge(JSON.parse(readFileSync(shardPath, 'utf8')) as Record<string, unknown>);
    console.log(`[merge-shard-coverage] merged ${shardPath}`);
  }

  mkdirSync(resolve(coverageRoot, 'node'), { recursive: true });
  writeFileSync(nodeCoveragePath, JSON.stringify(merged.toJSON(), null, 2));
  console.log(
    `[merge-shard-coverage] wrote ${nodeCoveragePath} from ${shardDirs.length} shard fragment(s)`,
  );
}

async function runScript(script: string): Promise<void> {
  const result = await spawnArgvVisible('pnpm', ['exec', 'tsx', script], { cwd: repoRoot });
  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

mergeShardCoverage();
const staged = stageSubprocessDumps();
if (staged > 0) {
  console.log(`[merge-shard-coverage] staged ${staged} subprocess dump(s) into ${subprocessTargetDir}`);
}
void (async () => {
  await runScript('scripts/merge-subprocess-v8.ts');
  await runScript('scripts/merge-coverage.ts');
})();

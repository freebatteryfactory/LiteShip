/**
 * Vitest shard runner for parallel CI — one shard index with isolated coverage dirs.
 *
 * Env:
 *   CZAP_SHARD_INDEX — 1-based shard index (required)
 *   CZAP_SHARD_TOTAL — total shard count (default 4)
 *
 * Writes node coverage to `coverage/node-shard-<index>/` and subprocess dumps to
 * `coverage/subprocess-raw-shard/<index>/`.
 *
 * @module
 */

import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnArgvVisible } from './lib/spawn.js';
import { CI_PARALLEL_TEST_SHARD_COUNT } from '../packages/cli/src/gauntlet-phases.js';
import { repoRoot } from '../vitest.shared.js';

const shardIndex = Number(process.env.CZAP_SHARD_INDEX ?? '');
const shardTotal = Number(process.env.CZAP_SHARD_TOTAL ?? CI_PARALLEL_TEST_SHARD_COUNT);

if (!Number.isInteger(shardIndex) || shardIndex < 1 || shardIndex > shardTotal) {
  console.error(
    `[test-shard] CZAP_SHARD_INDEX must be an integer in [1, ${shardTotal}] (got ${process.env.CZAP_SHARD_INDEX ?? 'unset'})`,
  );
  process.exit(1);
}

const coverageShardRel = `coverage/node-shard-${shardIndex}`;
const coverageShardDir = resolve(repoRoot, coverageShardRel);
const subprocessShardDir = resolve(repoRoot, `coverage/subprocess-raw-shard/${shardIndex}`);
const coverageFinalPath = resolve(coverageShardDir, 'coverage-final.json');
mkdirSync(coverageShardDir, { recursive: true });
mkdirSync(subprocessShardDir, { recursive: true });

async function main(): Promise<void> {
  console.log(`[test-shard] running shard ${shardIndex}/${shardTotal}`);
  const result = await spawnArgvVisible(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--config',
      'vitest.config.ts',
      '--coverage',
      `--coverage.reportsDirectory=${coverageShardRel}`,
      `--shard=${shardIndex}/${shardTotal}`,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        CZAP_COVERAGE_SHARD_DIR: coverageShardRel,
        NODE_V8_COVERAGE: `coverage/subprocess-raw-shard/${shardIndex}`,
      },
    },
  );
  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
  if (!existsSync(coverageFinalPath)) {
    console.error(`[test-shard] expected coverage report missing: ${coverageFinalPath}`);
    process.exit(1);
  }
  console.log(`[test-shard] wrote ${coverageFinalPath}`);
}

void main();

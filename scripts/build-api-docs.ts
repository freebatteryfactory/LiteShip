#!/usr/bin/env tsx
/**
 * Sharded TypeDoc build (#136) — one subprocess per entry point so peak memory
 * stays ~4GB/shard instead of ~8GB+ for the monolith. Merges into `docs/api/`
 * for byte-faithful output that `docs:check` can diff.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { spawnArgv } from './lib/spawn.js';

const REPO_ROOT = join(import.meta.dirname, '..');
const TYPEDOC_JSON = join(REPO_ROOT, 'typedoc.json');
const OUT_DIR = join(REPO_ROOT, 'docs', 'api');
const SHARD_ROOT = join(REPO_ROOT, '.typedoc-shards');
const DOCS_NODE_OPTIONS = ['--max-old-space-size=4096', process.env.NODE_OPTIONS ?? ''].join(' ').trim();

interface TypedocConfig {
  readonly entryPoints: readonly string[];
  readonly readme?: string;
  readonly gitRevision?: string;
}

function loadConfig(): TypedocConfig {
  return JSON.parse(readFileSync(TYPEDOC_JSON, 'utf8')) as TypedocConfig;
}

/** Relocate `@czap/<pkg>/<pkg>/src` merge artifacts to `<pkg>/src`. */
function flattenMergedOutput(dir: string): void {
  for (const pkg of readdirSync(dir)) {
    const nested = join(dir, pkg, pkg, 'src');
    const flat = join(dir, pkg, 'src');
    if (!existsSync(nested)) continue;
    cpSync(nested, flat, { recursive: true });
    rmSync(join(dir, pkg, pkg), { recursive: true, force: true });
  }
}

function shardOutDir(index: number): string {
  return join(SHARD_ROOT, `shard-${String(index).padStart(2, '0')}`);
}

async function runShard(entryPoint: string, index: number): Promise<void> {
  const out = shardOutDir(index);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const relEntry = relative(REPO_ROOT, join(REPO_ROOT, entryPoint));
  const pkgDir = relEntry.startsWith('packages/') ? relEntry.split('/').slice(0, 2).join('/') : 'packages';

  const shardTsconfig = join(shardOutDir(index), 'tsconfig.json');
  writeFileSync(
    shardTsconfig,
    JSON.stringify(
      {
        extends: '../../tsconfig.json',
        compilerOptions: {
          composite: false,
          skipLibCheck: true,
          skipErrorChecking: true,
        },
        include: [join(REPO_ROOT, pkgDir, '**/*')],
      },
      null,
      2,
    ),
  );

  const args = [
    'exec',
    'typedoc',
    '--options',
    TYPEDOC_JSON,
    '--entryPoints',
    join(REPO_ROOT, entryPoint),
    '--entryPointStrategy',
    'expand',
    '--out',
    out,
    '--tsconfig',
    shardTsconfig,
    '--basePath',
    join(REPO_ROOT, 'packages'),
    '--gitRevision',
    'main',
  ];

  // SpawnArgvOpts has no env field — child inherits process.env (same pattern as build-wasm).
  const prevNodeOptions = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = DOCS_NODE_OPTIONS;
  try {
    const result = await spawnArgv('pnpm', args, {
      stdio: 'inherit',
      cwd: REPO_ROOT,
    });
    if (result.exitCode !== 0) {
      throw new Error(`typedoc shard failed for ${entryPoint} (exit ${result.exitCode})`);
    }
  } finally {
    if (prevNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = prevNodeOptions;
  }
  flattenMergedOutput(out);
}

function mergeShards(count: number): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Root index from the first shard that produced modules.md
  for (let i = 0; i < count; i++) {
    const shard = shardOutDir(i);
    const modules = join(shard, 'modules.md');
    if (existsSync(modules)) {
      cpSync(modules, join(OUT_DIR, 'modules.md'));
      break;
    }
  }

  for (let i = 0; i < count; i++) {
    const shard = shardOutDir(i);
    for (const entry of readdirSync(shard)) {
      if (entry === 'modules.md') continue;
      const src = join(shard, entry);
      const dest = join(OUT_DIR, entry);
      if (existsSync(dest)) {
        for (const sub of readdirSync(src)) {
          cpSync(join(src, sub), join(dest, sub), { recursive: true, force: true });
        }
      } else {
        cpSync(src, dest, { recursive: true });
      }
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const entryPoints = [...config.entryPoints];
  rmSync(SHARD_ROOT, { recursive: true, force: true });
  mkdirSync(SHARD_ROOT, { recursive: true });

  for (let index = 0; index < entryPoints.length; index++) {
    const entry = entryPoints[index]!;
    console.log(`[build-api-docs] shard ${index + 1}/${entryPoints.length}: ${entry}`);
    await runShard(entry, index);
  }

  mergeShards(entryPoints.length);
  const digest = createHash('sha256').update(readFileSync(TYPEDOC_JSON)).digest('hex').slice(0, 16);
  writeFileSync(
    join(OUT_DIR, 'build-meta.json'),
    JSON.stringify({ builder: 'scripts/build-api-docs.ts', shards: entryPoints.length, digest }, null, 2) + '\n',
  );
  console.log(`[build-api-docs] merged ${entryPoints.length} shards → ${OUT_DIR}`);
}

void main();

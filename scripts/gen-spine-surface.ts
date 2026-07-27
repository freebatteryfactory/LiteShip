#!/usr/bin/env tsx
/** Generate or verify the explicit `@liteship/_spine` type surface. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectExecution } from './audit/shared.js';
import {
  analyzeRepositorySpine,
  renderSpineBarrel,
  renderSpineSymbolDocumentation,
} from './lib/spine-surface-contract.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
export const SPINE_BARREL = 'packages/_spine/index.d.ts';
export const SPINE_SYMBOL_DOCS = 'packages/_spine/SYMBOLS.md';

const projectionCache = new Map<string, ReadonlyArray<readonly [string, string]>>();

export function renderSpineProjections(repoRoot = REPO_ROOT): ReadonlyArray<readonly [string, string]> {
  const key = resolve(repoRoot);
  const cached = projectionCache.get(key);
  if (cached !== undefined) return cached;
  const analysis = analyzeRepositorySpine(repoRoot);
  const projections = [
    [SPINE_BARREL, renderSpineBarrel(analysis)],
    [SPINE_SYMBOL_DOCS, renderSpineSymbolDocumentation(analysis)],
  ] as const;
  projectionCache.set(key, projections);
  return projections;
}

function write(): number {
  for (const [relativePath, expected] of renderSpineProjections()) {
    const path = resolve(REPO_ROOT, relativePath);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) writeFileSync(path, expected, 'utf8');
  }
  process.stdout.write('gen-spine-surface: wrote explicit barrel and symbol documentation.\n');
  return 0;
}

function check(): number {
  const stale = renderSpineProjections().filter(([relativePath, expected]) => {
    const path = resolve(REPO_ROOT, relativePath);
    return !existsSync(path) || readFileSync(path, 'utf8') !== expected;
  });
  if (stale.length === 0) {
    process.stdout.write('gen-spine-surface: declaration barrel and symbol documentation are current.\n');
    return 0;
  }
  for (const [path] of stale) process.stderr.write(`gen-spine-surface: stale ${path}\n`);
  return 1;
}

export function main(argv: readonly string[]): number {
  return argv.includes('--write') ? write() : check();
}

if (isDirectExecution(import.meta.url)) process.exitCode = main(process.argv.slice(2));

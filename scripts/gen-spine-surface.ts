#!/usr/bin/env tsx
/** Generate or verify the explicit `@liteship/_spine` type surface. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectExecution } from './audit/shared.js';
import {
  analyzeRepositorySpine,
  assertSpineProvenanceComplete,
  classifySpineProvenance,
  renderSpineBarrel,
  renderSpineProvenanceProjection,
  renderSpineSymbolDocumentation,
} from './lib/spine-surface-contract.js';
import { analyzeRepositoryPublicExports } from './lib/public-export-contract.js';
import { PACKAGE_CATALOG } from './package-catalog.js';
import { LITESHIP_SPINE_AUTHORED_ADMISSIONS } from '../packages/cli/src/internal/spine-relation-admissions.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
export const SPINE_BARREL = 'packages/_spine/index.d.ts';
export const SPINE_SYMBOL_DOCS = 'packages/_spine/SYMBOLS.md';
export const SPINE_PROVENANCE = 'packages/cli/src/internal/spine-provenance.generated.ts';

/**
 * Three public-name collisions whose owning leaf makes the intended runtime
 * twin unambiguous. These are ownership decisions, not a second symbol census.
 */
export const SPINE_RUNTIME_OWNER_OVERRIDES = [
  {
    symbol: 'Primitive',
    producer: 'packages/core/src/reactive/primitive.ts',
    reason: 'core.d.ts declares the reactive Cell | Derived | Zap primitive, not Vite discovery',
  },
  {
    symbol: 'Scheduler',
    producer: 'packages/core/src/reactive/scheduler.ts',
    reason: 'core.d.ts declares FrameScheduler, not the simulation campaign scheduler',
  },
  {
    symbol: 'Disposer',
    producer: 'packages/detect/src/detect-ready.ts',
    reason: 'detect.d.ts declares the watchCapabilities teardown callback',
  },
] as const;

/** Generated declaration leaves whose shapes project owner-local protocol catalogs. */
export const SPINE_PROTOCOL_PROJECTIONS = [
  {
    leaf: 'events.generated.d.ts',
    generator: 'scripts/lib/event-protocol-contract.ts',
    ownerCatalogs: [
      'packages/astro/src/runtime/event-protocol.ts',
      'packages/detect/src/event-protocol.ts',
      'packages/scene/src/dev/event-protocol.ts',
      'packages/vite/src/event-protocol.ts',
      'packages/web/src/wire/event-protocol.ts',
    ],
  },
] as const;

const projectionCache = new Map<string, ReadonlyArray<readonly [string, string]>>();

export function renderSpineProjections(repoRoot = REPO_ROOT): ReadonlyArray<readonly [string, string]> {
  const key = resolve(repoRoot);
  const cached = projectionCache.get(key);
  if (cached !== undefined) return cached;
  const analysis = analyzeRepositorySpine(repoRoot);
  const publicExports = analyzeRepositoryPublicExports(repoRoot, PACKAGE_CATALOG);
  const provenance = classifySpineProvenance(
    analysis,
    publicExports.contracts,
    LITESHIP_SPINE_AUTHORED_ADMISSIONS,
    SPINE_RUNTIME_OWNER_OVERRIDES,
    SPINE_PROTOCOL_PROJECTIONS,
  );
  assertSpineProvenanceComplete(provenance);
  const projections = [
    [SPINE_BARREL, renderSpineBarrel(analysis)],
    [SPINE_SYMBOL_DOCS, renderSpineSymbolDocumentation(analysis)],
    [SPINE_PROVENANCE, renderSpineProvenanceProjection(provenance)],
  ] as const;
  projectionCache.set(key, projections);
  return projections;
}

function write(): number {
  for (const [relativePath, expected] of renderSpineProjections()) {
    const path = resolve(REPO_ROOT, relativePath);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) writeFileSync(path, expected, 'utf8');
  }
  process.stdout.write('gen-spine-surface: wrote barrel, symbol documentation, and provenance projection.\n');
  return 0;
}

function check(): number {
  const stale = renderSpineProjections().filter(([relativePath, expected]) => {
    const path = resolve(REPO_ROOT, relativePath);
    return !existsSync(path) || readFileSync(path, 'utf8') !== expected;
  });
  if (stale.length === 0) {
    process.stdout.write('gen-spine-surface: declaration barrel, symbol documentation, and provenance are current.\n');
    return 0;
  }
  for (const [path] of stale) process.stderr.write(`gen-spine-surface: stale ${path}\n`);
  return 1;
}

export function main(argv: readonly string[]): number {
  return argv.includes('--write') ? write() : check();
}

if (isDirectExecution(import.meta.url)) process.exitCode = main(process.argv.slice(2));

#!/usr/bin/env tsx
/**
 * Generate the data-only operator projection of LiteShip's curated facade.
 *
 * Authored truth stays in `packages/liteship/src/export-budget.ts`; this file
 * derives check, proof, route, and remediation context and validates every
 * cross-reference before writing the command-owned projection.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACADE_LIFECYCLE_CONTRACT,
  FACADE_FAILURE_PROOF_CONTRACT,
  FACADE_SUBPATH_CONTRACT,
  ROOT_EXPORT_CONTRACT,
} from '../packages/liteship/src/export-budget.js';
import { CHECK_REGISTRY } from '../packages/command/src/checks/registry.js';
import { isDirectExecution } from './audit/shared.js';
import { verifyExecutableFailureProof } from './lib/executable-failure-proof.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
export const PUBLIC_SURFACE_CONTEXT_TS = 'packages/command/src/commands/public-surface-context.generated.ts';

const ROOT_EXPERT_ROUTES: Readonly<Record<string, readonly string[]>> = {
  '@liteship/core/authoring': ['liteship/reactive', 'liteship/compiler'],
  '@liteship/quantizer': ['liteship/reactive', 'liteship/compiler'],
  liteship: ['liteship/reactive', 'liteship/motion', 'liteship/compiler', 'liteship/astro', 'liteship/vite'],
  '@liteship/core/schema': ['liteship/schema'],
  '@liteship/error': ['liteship/evidence'],
};

const dedupe = (values: readonly string[]): readonly string[] => [...new Set(values)];

function rootChecks(name: string, kind: string): readonly string[] {
  const base = kind === 'type' ? ['check/typecheck', 'check/hermetic'] : ['check/test', 'check/hermetic'];
  if (name === 'defineAdaptive' || name === 'Adaptive') return [...base, 'check/journey', 'check/test-e2e'];
  if (name === 'defineConfig' || name === 'Config') return [...base, 'check/test-vite', 'check/test-astro'];
  return base;
}

function rootProofs(name: string, kind: string): readonly string[] {
  const proofs = [
    kind === 'type' ? 'tests/unit/meta/api-surface.test.ts' : 'tests/unit/liteship/facade-subpaths.test.ts',
  ];
  if (['defineConfig', 'defineBoundary', 'defineStyle', 'defineAdaptive'].includes(name)) {
    proofs.push('tests/unit/liteship/root-failure-contract.test.ts');
  }
  if (name === 'defineAdaptive' || name === 'Adaptive') {
    proofs.push('tests/property/adaptive-lowering-equivalence.prop.test.ts', 'tests/e2e/astro-directives.e2e.ts');
  }
  return dedupe(proofs);
}

function subpathChecks(specifier: string): readonly string[] {
  const checks = ['check/hermetic', 'check/test'];
  if (specifier === 'liteship/astro') checks.push('check/test-astro');
  if (specifier === 'liteship/vite') checks.push('check/test-vite');
  if (specifier === 'liteship/runtime') checks.push('check/test-e2e');
  if (specifier === 'liteship/testing') checks.push('check/capsule-verify');
  if (specifier === 'liteship/genui') checks.push('check/journey');
  return checks;
}

function remediation(owner: string, example: string, checks: readonly string[]): string {
  return `Correct the input at ${owner}, retry ${example}, then run ${checks.join(' and ')}.`;
}

export interface PublicSurfaceContextDrift {
  readonly source: string;
  readonly detail: string;
}

/** Build the deterministic projection before rendering it as generated TS. */
export function buildPublicSurfaceContext() {
  const root = ROOT_EXPORT_CONTRACT.map((entry) => {
    const checkIds = rootChecks(entry.name, entry.kind);
    return {
      kind: 'root' as const,
      symbol: entry.name,
      specifier: 'liteship',
      owner: entry.owner,
      audience: entry.audience,
      category: entry.role,
      surfaceClass: entry.surfaceClass,
      producer: entry.producer,
      relatedInvariant: entry.relatedInvariant,
      replacement: entry.replacement,
      userStory: entry.userStory,
      lifecycle: entry.lifecycle,
      failureContract: entry.failureContract,
      failureProof: null,
      example: entry.example,
      stability: entry.stability,
      expertRoutes: ROOT_EXPERT_ROUTES[entry.owner] ?? [],
      checkIds,
      proofRefs: dedupe([entry.exampleProof, ...rootProofs(entry.name, entry.kind)]),
      remediation: remediation(entry.owner, entry.example, checkIds),
    };
  });

  const subpaths = FACADE_SUBPATH_CONTRACT.map((entry) => {
    const checkIds = subpathChecks(entry.specifier);
    const failureProof = FACADE_FAILURE_PROOF_CONTRACT[entry.specifier] ?? null;
    const lifecycleProofs = FACADE_LIFECYCLE_CONTRACT.filter((row) => row.specifier === entry.specifier).map(
      (row) => row.proof,
    );
    return {
      kind: 'subpath' as const,
      symbol: entry.symbol,
      specifier: entry.specifier,
      owner: entry.owner,
      audience: entry.audience,
      category: entry.role,
      surfaceClass: entry.surfaceClass,
      producer: entry.producer,
      relatedInvariant: entry.relatedInvariant,
      replacement: entry.replacement,
      role: entry.role,
      userStory: entry.userStory,
      lifecycle: entry.lifecycle,
      failureContract: entry.failureContract,
      failureProof,
      example: entry.example,
      stability: entry.stability,
      dependencyCost: entry.dependencyCost,
      packedProof: entry.packedProof,
      reason: entry.reason,
      expertRoutes: [entry.specifier],
      checkIds,
      proofRefs: dedupe([
        entry.exampleProof,
        'tests/unit/liteship/facade-subpaths.test.ts',
        ...(failureProof === null ? [] : [failureProof.test.split('::', 1)[0]!]),
        ...lifecycleProofs,
      ]),
      remediation: remediation(entry.owner, entry.example, checkIds),
    };
  });

  const lifecycle = FACADE_LIFECYCLE_CONTRACT.map((entry) => ({
    ...entry,
    checkIds: subpathChecks(entry.specifier),
    remediation:
      entry.classification === 'active-owned'
        ? `Dispose through ${entry.disposal} and verify ${entry.proof}; cleanup must remain idempotent, inert, and attempt-all.`
        : `Do not add artificial disposal; ${entry.rationale} Verify ${entry.proof}.`,
  }));

  return { root, subpaths, lifecycle } as const;
}

/** Validate every generated route/check/proof against its independent owner. */
export function collectPublicSurfaceContextDrift(): readonly PublicSurfaceContextDrift[] {
  const projection = buildPublicSurfaceContext();
  const drift: PublicSurfaceContextDrift[] = [];
  const checks = new Set(CHECK_REGISTRY.map((entry) => entry.id));
  const manifest = JSON.parse(readFileSync(resolve(REPO_ROOT, 'packages/liteship/package.json'), 'utf8')) as {
    readonly exports?: Readonly<Record<string, unknown>>;
  };
  const routes = new Set(
    Object.keys(manifest.exports ?? {}).map((subpath) =>
      subpath === '.' ? 'liteship' : `liteship/${subpath.replace(/^\.\//u, '')}`,
    ),
  );

  for (const entry of [...projection.root, ...projection.subpaths]) {
    if (!routes.has(entry.specifier)) {
      drift.push({ source: entry.symbol, detail: `public route is absent from liteship exports: ${entry.specifier}` });
    }
    for (const route of entry.expertRoutes) {
      if (!routes.has(route)) drift.push({ source: entry.symbol, detail: `expert route is not public: ${route}` });
    }
    for (const checkId of entry.checkIds) {
      if (!checks.has(checkId))
        drift.push({ source: entry.symbol, detail: `check is absent from CHECK_REGISTRY: ${checkId}` });
    }
    for (const proof of entry.proofRefs) {
      if (!existsSync(resolve(REPO_ROOT, proof)))
        drift.push({ source: entry.symbol, detail: `proof does not exist: ${proof}` });
    }
  }
  for (const entry of projection.lifecycle) {
    if (!routes.has(entry.specifier)) {
      drift.push({ source: entry.operation, detail: `lifecycle route is not public: ${entry.specifier}` });
    }
    for (const checkId of entry.checkIds) {
      if (!checks.has(checkId)) drift.push({ source: entry.operation, detail: `check is absent: ${checkId}` });
    }
    if (!existsSync(resolve(REPO_ROOT, entry.proof))) {
      drift.push({ source: entry.operation, detail: `lifecycle proof does not exist: ${entry.proof}` });
    }
  }
  const subpathSpecifiers = new Set(FACADE_SUBPATH_CONTRACT.map((entry) => entry.specifier));
  for (const [specifier, proof] of Object.entries(FACADE_FAILURE_PROOF_CONTRACT)) {
    if (!subpathSpecifiers.has(specifier as `liteship/${string}`)) {
      drift.push({ source: specifier, detail: 'failure proof has no authored facade subpath contract' });
      continue;
    }
    for (const finding of verifyExecutableFailureProof(REPO_ROOT, proof)) {
      drift.push({ source: specifier, detail: `${finding.kind}: ${finding.detail}` });
    }
  }
  return drift;
}

export function renderPublicSurfaceContext(): string {
  const drift = collectPublicSurfaceContextDrift();
  if (drift.length > 0) {
    throw new Error(
      `public-surface context drift:\n${drift.map((item) => `  - ${item.source}: ${item.detail}`).join('\n')}`,
    );
  }
  return (
    '/** @generated by scripts/gen-public-surface-context.ts from packages/liteship/src/export-budget.ts; do not hand-edit. */\n' +
    '// prettier-ignore\n' +
    `export const GENERATED_PUBLIC_SURFACE_CONTEXT = ${JSON.stringify(buildPublicSurfaceContext(), null, 2)} as const;\n` +
    'export type GeneratedPublicSurfaceContext = typeof GENERATED_PUBLIC_SURFACE_CONTEXT;\n'
  );
}

export function main(argv: readonly string[]): number {
  const path = resolve(REPO_ROOT, PUBLIC_SURFACE_CONTEXT_TS);
  const expected = renderPublicSurfaceContext();
  if (argv.includes('--write')) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) writeFileSync(path, expected);
    process.stdout.write(`public-surface context: wrote ${PUBLIC_SURFACE_CONTEXT_TS}\n`);
    return 0;
  }
  if (argv.includes('--check')) {
    if (existsSync(path) && readFileSync(path, 'utf8') === expected) {
      process.stdout.write('public-surface context: projection is current\n');
      return 0;
    }
    process.stderr.write(`public-surface context: stale projection ${PUBLIC_SURFACE_CONTEXT_TS}\n`);
    return 1;
  }
  process.stdout.write(expected);
  return 0;
}

if (isDirectExecution(import.meta.url)) process.exitCode = main(process.argv.slice(2));

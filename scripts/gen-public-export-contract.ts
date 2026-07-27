#!/usr/bin/env tsx
/** Generate or verify the exact public-export contract projection. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDirectExecution } from './audit/shared.js';
import { PACKAGE_CATALOG } from './package-catalog.js';
import {
  analyzeRepositoryPublicExports,
  assertPublicExportContracts,
  type PublicExportContract,
} from './lib/public-export-contract.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
export const PUBLIC_EXPORT_CONTRACT_DOC = 'PUBLIC-EXPORTS.md';
let cachedProjection: string | undefined;

function renderGroup(specifier: string, contracts: readonly PublicExportContract[]): string {
  const first = contracts[0]!;
  const declarationOwners = new Set(contracts.map((contract) => contract.producer)).size;
  return `| \`${specifier}\` | ${first.surfaceClass} | ${first.audience} | ${first.stability} | ${contracts.length} | ${declarationOwners} | \`${first.relatedInvariant}\` |`;
}

/** Render all named consumer routes from live TypeScript ownership. */
export function renderPublicExportContract(repoRoot = REPO_ROOT): string {
  if (cachedProjection !== undefined && resolve(repoRoot) === REPO_ROOT) return cachedProjection;
  const analysis = analyzeRepositoryPublicExports(repoRoot, PACKAGE_CATALOG);
  assertPublicExportContracts(analysis);
  const bySpecifier = new Map<string, PublicExportContract[]>();
  for (const contract of analysis.contracts) {
    const group = bySpecifier.get(contract.specifier) ?? [];
    group.push(contract);
    bySpecifier.set(contract.specifier, group);
  }
  const rendered = [
    '# LiteShip public export contracts',
    '',
    'Generated from the typed 25-package catalog and the TypeScript export graph. The `liteship` root is the paved road; package and facade subpaths are advanced modules. `public-exports:check` proves every named binding is export-reachable and has a source declaration owner, consumer import spelling, TSDoc purpose, failure policy, invariant, replacement status, and named package proof. The binding total is not a claim that every structural type has a concrete runtime inhabitant: executable allocation/read proof is exhaustive only for paved-road root values; advanced type inhabitation remains an explicit owner contract. Use `liteship explain <symbol>` for the symbol-level answer.',
    '',
    `Bindings: **${analysis.contracts.length}** across **${bySpecifier.size}** public specifiers.`,
    '',
    '| Specifier | Surface | Audience | Stability | Bindings | Declaration owners | Invariant |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
    ...[...bySpecifier]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([specifier, contracts]) => renderGroup(specifier, contracts)),
    '',
    'Exact symbol metadata is intentionally not mirrored as a megabyte-scale prose table: declaration TSDoc is its owner, the generated TypeDoc/API index is its projection, and the public-export contract gate proves the full relation.',
    '',
  ].join('\n');
  if (resolve(repoRoot) === REPO_ROOT) cachedProjection = rendered;
  return rendered;
}

export function renderPublicExportProjections(repoRoot = REPO_ROOT): ReadonlyArray<readonly [string, string]> {
  return [[PUBLIC_EXPORT_CONTRACT_DOC, renderPublicExportContract(repoRoot)]];
}

function write(): number {
  for (const [relativePath, expected] of renderPublicExportProjections()) {
    const path = resolve(REPO_ROOT, relativePath);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) writeFileSync(path, expected, 'utf8');
  }
  process.stdout.write('gen-public-export-contract: wrote exact public export documentation.\n');
  return 0;
}

function check(): number {
  const stale = renderPublicExportProjections().filter(([relativePath, expected]) => {
    const path = resolve(REPO_ROOT, relativePath);
    return !existsSync(path) || readFileSync(path, 'utf8') !== expected;
  });
  if (stale.length === 0) {
    process.stdout.write('gen-public-export-contract: public export contracts are current.\n');
    return 0;
  }
  for (const [relativePath] of stale) process.stderr.write(`gen-public-export-contract: stale ${relativePath}\n`);
  return 1;
}

export function main(argv: readonly string[]): number {
  return argv.includes('--write') ? write() : check();
}

if (isDirectExecution(import.meta.url)) process.exitCode = main(process.argv.slice(2));

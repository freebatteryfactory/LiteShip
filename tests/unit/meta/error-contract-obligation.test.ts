/**
 * Meta gate — every runtime @liteship/* package carries a dedicated error-contract suite.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoRoot } from '../../../vitest.shared.ts';

const EXCLUDED_PACKAGES = new Set([
  '@liteship/error',
  '@liteship/gauntlet',
  '@liteship/audit',
  '@liteship/command',
  '@liteship/cli',
  '@liteship/mcp-server',
  '@liteship/canonical',
  '@liteship/create-liteship',
  '@liteship/_spine',
  '@liteship/liteship',
]);

function runtimePackageNames(): string[] {
  const packagesDir = resolve(repoRoot, 'packages');
  const names: string[] = [];
  for (const dir of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; private?: boolean };
    if (!pkg.name?.startsWith('@liteship/')) continue;
    if (EXCLUDED_PACKAGES.has(pkg.name)) continue;
    names.push(pkg.name);
  }
  return names.sort();
}

function pkgDirName(pkgName: string): string {
  return pkgName.replace('@liteship/', '');
}

function hasErrorContractSuite(pkgName: string): boolean {
  const dir = resolve(repoRoot, 'tests/unit', pkgDirName(pkgName));
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some(
    (f) => f === 'error-contract.test.ts' || /error-contract.*\.test\.ts$/.test(f),
  );
}

describe('error-contract obligation — every runtime @liteship/* package', () => {
  it('has tests/unit/<pkg>/error-contract.test.ts (or *error-contract*.test.ts)', () => {
    const missing = runtimePackageNames().filter((name) => !hasErrorContractSuite(name));
    expect(missing, `packages missing error-contract suite: ${missing.join(', ')}`).toEqual([]);
  });
});

/**
 * Meta gate — every runtime @czap/* package carries a dedicated error-contract suite.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoRoot } from '../../../vitest.shared.ts';

const EXCLUDED_PACKAGES = new Set([
  '@czap/error',
  '@czap/gauntlet',
  '@czap/audit',
  '@czap/command',
  '@czap/cli',
  '@czap/mcp-server',
  '@czap/canonical',
  '@czap/create-liteship',
  '@czap/_spine',
  '@czap/liteship',
]);

function runtimePackageNames(): string[] {
  const packagesDir = resolve(repoRoot, 'packages');
  const names: string[] = [];
  for (const dir of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; private?: boolean };
    if (!pkg.name?.startsWith('@czap/')) continue;
    if (EXCLUDED_PACKAGES.has(pkg.name)) continue;
    names.push(pkg.name);
  }
  return names.sort();
}

function pkgDirName(pkgName: string): string {
  return pkgName.replace('@czap/', '');
}

function hasErrorContractSuite(pkgName: string): boolean {
  const dir = resolve(repoRoot, 'tests/unit', pkgDirName(pkgName));
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some(
    (f) => f === 'error-contract.test.ts' || /error-contract.*\.test\.ts$/.test(f),
  );
}

describe('error-contract obligation — every runtime @czap/* package', () => {
  it('has tests/unit/<pkg>/error-contract.test.ts (or *error-contract*.test.ts)', () => {
    const missing = runtimePackageNames().filter((name) => !hasErrorContractSuite(name));
    expect(missing, `packages missing error-contract suite: ${missing.join(', ')}`).toEqual([]);
  });
});

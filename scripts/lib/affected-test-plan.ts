/** Canonical package-DAG projection for conservative affected-test selection. @module */

import type { PackageCatalogRecord } from '../package-catalog.js';
import type { AssuranceInventory } from './assurance-inventory.js';

export interface AffectedTestPlan {
  readonly mode: 'focused' | 'full';
  readonly reason: string;
  readonly changedPaths: readonly string[];
  readonly affectedPackages: readonly string[];
  readonly testFiles: readonly string[];
  readonly browserRequired: boolean;
}

const GLOBAL_AUTHORITY = [
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/u,
  /^(?:tsconfig|vitest|typedoc|eslint)[^/]*\.(?:json|ts|js|mjs)$/u,
  /^\.github\//u,
  /^scripts\//u,
  /^packages\/command\/src\/checks\//u,
  /^packages\/[^/]+\/package\.json$/u,
];

export const MANDATORY_AFFECTED_TESTS = [
  'tests/unit/devops/assurance-inventory.test.ts',
  'tests/unit/devops/check-registry.test.ts',
  'tests/unit/devops/scripts-and-build-parity.test.ts',
  'tests/unit/devops/test-constitution.test.ts',
  'tests/unit/meta/ci-registry-parity.test.ts',
  'tests/unit/meta/source-grammar-rules.test.ts',
] as const;

function normalize(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '');
}

/** Reverse-dependency closure over the one package catalog. */
export function affectedPackageNames(
  changedPaths: readonly string[],
  catalog: readonly PackageCatalogRecord[],
): readonly string[] {
  const direct = new Set<string>();
  for (const rawPath of changedPaths) {
    const path = normalize(rawPath);
    const owner = catalog.find((record) => path === record.dir || path.startsWith(`${record.dir}/`));
    if (owner !== undefined) direct.add(owner.name);
  }
  const affected = new Set(direct);
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of catalog) {
      if (affected.has(record.name)) continue;
      if (record.dependencies.some((dependency) => affected.has(dependency))) {
        affected.add(record.name);
        changed = true;
      }
    }
  }
  return catalog.filter((record) => affected.has(record.name)).map((record) => record.name);
}

/** Build a fail-broad affected plan from changed paths and current evidence ownership. */
export function planAffectedTests(
  changedPaths: readonly string[],
  catalog: readonly PackageCatalogRecord[],
  inventory: AssuranceInventory,
): AffectedTestPlan {
  const normalized = [...new Set(changedPaths.map(normalize))].sort();
  const broadPath = normalized.find((path) => GLOBAL_AUTHORITY.some((pattern) => pattern.test(path)));
  const affectedPackages = affectedPackageNames(normalized, catalog);
  if (broadPath !== undefined) {
    return {
      mode: 'full',
      reason: `global authority changed: ${broadPath}`,
      changedPaths: normalized,
      affectedPackages,
      testFiles: [],
      browserRequired: true,
    };
  }

  const packageSet = new Set(affectedPackages);
  const ownedEvidence = inventory.packages
    .filter((entry) => packageSet.has(entry.name))
    .flatMap((entry) => entry.evidenceFiles);
  const changedTests = normalized.filter((path) => /^tests\/.*\.[cm]?[jt]sx?$/u.test(path));
  const candidates = [...new Set([...MANDATORY_AFFECTED_TESTS, ...ownedEvidence, ...changedTests])].sort();
  const browserRequired = candidates.some((path) => path.startsWith('tests/browser/') || path.startsWith('tests/e2e/'));
  const testFiles = candidates.filter(
    (path) => !path.startsWith('tests/browser/') && !path.startsWith('tests/e2e/') && !path.endsWith('.bench.ts'),
  );
  if (affectedPackages.length === 0 && changedTests.length === 0) {
    return {
      mode: 'focused',
      reason: 'no runtime package owner changed; run governance canaries',
      changedPaths: normalized,
      affectedPackages: [],
      testFiles: [...MANDATORY_AFFECTED_TESTS],
      browserRequired: false,
    };
  }
  if (testFiles.length > 250) {
    return {
      mode: 'full',
      reason: `affected closure selected ${testFiles.length} node tests (safety ceiling 250)`,
      changedPaths: normalized,
      affectedPackages,
      testFiles: [],
      browserRequired: true,
    };
  }
  return {
    mode: 'focused',
    reason: `canonical dependency closure selected ${affectedPackages.length} package(s)`,
    changedPaths: normalized,
    affectedPackages,
    testFiles,
    browserRequired,
  };
}

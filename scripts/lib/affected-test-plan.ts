/** Canonical package-DAG projection for conservative affected-test selection. @module */

import type { PackageCatalogRecord } from '../package-catalog.js';
import type { AssuranceInventory } from './assurance-inventory.js';

export interface AffectedTestPlan {
  readonly schemaVersion: 1;
  readonly mode: 'focused' | 'full';
  readonly reason: string;
  readonly changedPaths: readonly string[];
  readonly affectedPackages: readonly string[];
  readonly testFiles: readonly string[];
  readonly browserRequired: boolean;
  /** Commands that must succeed before any selected authority is executable. */
  readonly prerequisites: readonly AffectedPlanPrerequisite[];
}

export interface AffectedPlanPrerequisite {
  readonly id: 'workspace-build';
  readonly command: 'pnpm run build';
}

/** One prerequisite truth for affected Node and browser execution. */
export const AFFECTED_PLAN_PREREQUISITES = [
  { id: 'workspace-build', command: 'pnpm run build' },
] as const satisfies readonly AffectedPlanPrerequisite[];

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
      schemaVersion: 1,
      mode: 'full',
      reason: `global authority changed: ${broadPath}`,
      changedPaths: normalized,
      affectedPackages,
      testFiles: [],
      browserRequired: true,
      prerequisites: AFFECTED_PLAN_PREREQUISITES,
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
      schemaVersion: 1,
      mode: 'focused',
      reason: 'no runtime package owner changed; run governance canaries',
      changedPaths: normalized,
      affectedPackages: [],
      testFiles: [...MANDATORY_AFFECTED_TESTS],
      browserRequired: false,
      prerequisites: AFFECTED_PLAN_PREREQUISITES,
    };
  }
  if (testFiles.length > 250) {
    return {
      schemaVersion: 1,
      mode: 'full',
      reason: `affected closure selected ${testFiles.length} node tests (safety ceiling 250)`,
      changedPaths: normalized,
      affectedPackages,
      testFiles: [],
      browserRequired: true,
      prerequisites: AFFECTED_PLAN_PREREQUISITES,
    };
  }
  return {
    schemaVersion: 1,
    mode: 'focused',
    reason: `canonical dependency closure selected ${affectedPackages.length} package(s)`,
    changedPaths: normalized,
    affectedPackages,
    testFiles,
    browserRequired,
    prerequisites: AFFECTED_PLAN_PREREQUISITES,
  };
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** Parse an affected plan at a process/CI boundary. Foreign or partial plans fail closed. */
export function parseAffectedTestPlan(value: unknown): AffectedTestPlan {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('affected plan must be an object');
  }
  const candidate = value as Record<string, unknown>;
  const expectedKeys = [
    'affectedPackages',
    'browserRequired',
    'changedPaths',
    'mode',
    'prerequisites',
    'reason',
    'schemaVersion',
    'testFiles',
  ];
  const actualKeys = Object.keys(candidate).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new TypeError(`affected plan keys are invalid: ${actualKeys.join(', ')}`);
  }
  if (candidate['schemaVersion'] !== 1) throw new TypeError('affected plan schemaVersion must be 1');
  if (candidate['mode'] !== 'focused' && candidate['mode'] !== 'full') {
    throw new TypeError('affected plan mode must be focused or full');
  }
  if (typeof candidate['reason'] !== 'string' || candidate['reason'].length === 0) {
    throw new TypeError('affected plan reason must be a non-empty string');
  }
  if (!isStringArray(candidate['changedPaths'])) throw new TypeError('affected plan changedPaths must be strings');
  if (!isStringArray(candidate['affectedPackages'])) {
    throw new TypeError('affected plan affectedPackages must be strings');
  }
  if (!isStringArray(candidate['testFiles'])) throw new TypeError('affected plan testFiles must be strings');
  if (typeof candidate['browserRequired'] !== 'boolean') {
    throw new TypeError('affected plan browserRequired must be boolean');
  }
  const prerequisites = candidate['prerequisites'];
  if (
    !Array.isArray(prerequisites) ||
    prerequisites.length !== 1 ||
    typeof prerequisites[0] !== 'object' ||
    prerequisites[0] === null ||
    (prerequisites[0] as Record<string, unknown>)['id'] !== 'workspace-build' ||
    (prerequisites[0] as Record<string, unknown>)['command'] !== 'pnpm run build' ||
    Object.keys(prerequisites[0] as object)
      .sort()
      .join(',') !== 'command,id'
  ) {
    throw new TypeError('affected plan must declare the canonical workspace-build prerequisite');
  }
  if (candidate['mode'] === 'full' && candidate['testFiles'].length !== 0) {
    throw new TypeError('full affected plans must not carry a focused test list');
  }
  return candidate as unknown as AffectedTestPlan;
}

/** Canonical package-DAG projection for conservative affected-test selection. @module */

import { createHash } from 'node:crypto';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import { executionPrerequisites, type ExecutionPrerequisite } from './execution-prerequisites.js';
import type { AssuranceLevel } from '../../packages/gauntlet/src/assurance.js';
import type { PackageCatalogRecord } from '../package-catalog.js';
import type { AssuranceInventory } from './assurance-inventory.js';

export type AffectedRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AffectedPlanConfidence = 'high' | 'low';

export interface AffectedPlanContext {
  readonly baseRef: string;
  readonly baseSha: string;
  readonly headSha: string;
  readonly confidence: AffectedPlanConfidence;
  readonly rationale?: readonly string[];
}

export interface AffectedTestPlan {
  readonly schemaVersion: 2;
  readonly planId: `sha256:${string}`;
  readonly base: { readonly ref: string; readonly sha: string };
  readonly headSha: string;
  readonly changedPathDigest: `sha256:${string}`;
  readonly mode: 'focused' | 'full';
  readonly reason: string;
  readonly confidence: AffectedPlanConfidence;
  readonly rationale: readonly string[];
  readonly changedPaths: readonly string[];
  readonly affectedPackages: readonly string[];
  readonly risk: {
    readonly level: AffectedRiskLevel;
    readonly highestAssurance: AssuranceLevel;
    readonly factors: readonly string[];
  };
  readonly requiredChecks: readonly string[];
  readonly testFiles: readonly string[];
  readonly testPartitions: {
    readonly node: readonly string[];
    readonly browserRequired: boolean;
  };
  readonly browserRequired: boolean;
  readonly platforms: readonly ('linux' | 'win32' | 'browser')[];
  readonly prerequisites: readonly ExecutionPrerequisite[];
  readonly artifacts: readonly ['affected-plan', 'test-results'];
  readonly estimatedCost: {
    readonly selectedNodeTests: number;
    readonly upperBoundMs: number;
  };
}

type UnsignedAffectedTestPlan = Omit<AffectedTestPlan, 'planId'>;

/** Every affected executor starts only after these setup claims hold. */
export const AFFECTED_PLAN_PREREQUISITES = executionPrerequisites(['install', 'workspace-build']);

const GLOBAL_AUTHORITY = [
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/u,
  /^(?:tsconfig|vitest|typedoc|eslint)[^/]*\.(?:json|ts|js|mjs)$/u,
  /^\.github\//u,
  /^scripts\//u,
  /^packages\/command\/src\/checks\//u,
  /^packages\/[^/]+\/package\.json$/u,
];

const PUBLIC_OR_WIRE_SURFACE = /\/(?:index|contract|schema|brands|protocol|manifest|capsule)\.ts$/u;
const HOST_SURFACE = /^packages\/(?:astro|vite|cloudflare|worker|web|edge|remotion|stage)\//u;

export const MANDATORY_AFFECTED_TESTS = [
  'tests/unit/devops/assurance-inventory.test.ts',
  'tests/unit/devops/check-registry.test.ts',
  'tests/unit/devops/scripts-and-build-parity.test.ts',
  'tests/unit/devops/test-constitution.test.ts',
  'tests/unit/meta/ci-registry-parity.test.ts',
  'tests/unit/meta/source-grammar-rules.test.ts',
] as const;

const DEFAULT_CONTEXT: AffectedPlanContext = {
  baseRef: 'unknown',
  baseSha: 'unresolved',
  headSha: 'unresolved',
  confidence: 'high',
};

function normalize(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function digest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stableSerialize(value)).digest('hex')}`;
}

function assuranceRank(level: AssuranceLevel): number {
  return Number(level.slice(1));
}

function highestAssurance(affected: readonly string[], inventory: AssuranceInventory): AssuranceLevel {
  return inventory.packages
    .filter((entry) => affected.includes(entry.name))
    .reduce<AssuranceLevel>(
      (highest, entry) =>
        assuranceRank(entry.highestAssurance) > assuranceRank(highest) ? entry.highestAssurance : highest,
      'L0',
    );
}

function requiredCheckIds(browserRequired: boolean): readonly string[] {
  const ids = CHECK_REGISTRY.filter(
    (check) => check.contexts.includes('repository') && check.profiles.includes('quick'),
  ).map((check) => check.id);
  const required = new Set([...ids, 'check/test']);
  if (browserRequired) required.add('check/test-e2e');
  const registryOrder = new Map(CHECK_REGISTRY.map((check, index) => [check.id, index] as const));
  return [...required].sort(
    (a, b) => (registryOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (registryOrder.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

function riskFor(
  mode: 'focused' | 'full',
  paths: readonly string[],
  affected: readonly string[],
  inventory: AssuranceInventory,
  confidence: AffectedPlanConfidence,
): AffectedTestPlan['risk'] {
  const highest = highestAssurance(affected, inventory);
  const factors = new Set<string>();
  if (mode === 'full') factors.add('global-authority');
  if (assuranceRank(highest) >= 4) factors.add('L4-authority');
  else if (assuranceRank(highest) >= 3) factors.add('L3-authority');
  if (paths.some((path) => PUBLIC_OR_WIRE_SURFACE.test(path))) factors.add('public-or-wire-surface');
  if (paths.some((path) => HOST_SURFACE.test(path))) factors.add('host-or-platform-surface');
  if (confidence === 'low') factors.add('low-selector-confidence');
  const level: AffectedRiskLevel =
    mode === 'full' || confidence === 'low' || assuranceRank(highest) >= 4
      ? 'critical'
      : assuranceRank(highest) >= 3 || factors.has('public-or-wire-surface')
        ? 'high'
        : assuranceRank(highest) >= 2 || factors.has('host-or-platform-surface')
          ? 'moderate'
          : 'low';
  return { level, highestAssurance: highest, factors: [...factors].sort() };
}

function finalizePlan(
  input: Omit<
    UnsignedAffectedTestPlan,
    | 'planId'
    | 'changedPathDigest'
    | 'risk'
    | 'requiredChecks'
    | 'testPartitions'
    | 'platforms'
    | 'prerequisites'
    | 'artifacts'
    | 'estimatedCost'
  >,
  inventory: AssuranceInventory,
): AffectedTestPlan {
  const risk = riskFor(input.mode, input.changedPaths, input.affectedPackages, inventory, input.confidence);
  const unsigned: UnsignedAffectedTestPlan = {
    ...input,
    changedPathDigest: digest(input.changedPaths),
    risk,
    requiredChecks: requiredCheckIds(input.browserRequired),
    testPartitions: { node: input.testFiles, browserRequired: input.browserRequired },
    platforms: input.browserRequired ? ['linux', 'win32', 'browser'] : ['linux', 'win32'],
    prerequisites: AFFECTED_PLAN_PREREQUISITES,
    artifacts: ['affected-plan', 'test-results'],
    estimatedCost: {
      selectedNodeTests:
        input.mode === 'full'
          ? new Set(inventory.packages.flatMap((entry) => entry.evidenceFiles)).size
          : input.testFiles.length,
      upperBoundMs: input.mode === 'full' ? 45 * 60_000 : Math.max(60_000, input.testFiles.length * 15_000),
    },
  };
  return { ...unsigned, planId: digest(unsigned) };
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

/** Build a fail-broad, risk-classified affected plan from current evidence ownership. */
export function planAffectedTests(
  changedPaths: readonly string[],
  catalog: readonly PackageCatalogRecord[],
  inventory: AssuranceInventory,
  context: AffectedPlanContext = DEFAULT_CONTEXT,
): AffectedTestPlan {
  const normalized = [...new Set(changedPaths.map(normalize))].sort();
  const broadPath = normalized.find((path) => GLOBAL_AUTHORITY.some((pattern) => pattern.test(path)));
  const affectedPackages = affectedPackageNames(normalized, catalog);
  const common = {
    schemaVersion: 2 as const,
    base: { ref: context.baseRef, sha: context.baseSha },
    headSha: context.headSha,
    confidence: context.confidence,
    rationale: [...(context.rationale ?? [])],
    changedPaths: normalized,
    affectedPackages,
  };
  if (broadPath !== undefined || context.confidence === 'low') {
    const reason =
      context.confidence === 'low'
        ? 'selector confidence is low; selected full authority'
        : `global authority changed: ${broadPath}`;
    return finalizePlan({ ...common, mode: 'full', reason, testFiles: [], browserRequired: true }, inventory);
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
  const unknownRuntimePath = normalized.find(
    (path) => /\.[cm]?[jt]sx?$/u.test(path) && !path.startsWith('tests/') && !path.startsWith('packages/'),
  );
  if (unknownRuntimePath !== undefined) {
    return finalizePlan(
      {
        ...common,
        mode: 'full',
        reason: `runtime source has no package owner: ${unknownRuntimePath}`,
        rationale: [...common.rationale, 'unknown ownership fails broad'],
        testFiles: [],
        browserRequired: true,
      },
      inventory,
    );
  }
  if (affectedPackages.length === 0 && changedTests.length === 0) {
    return finalizePlan(
      {
        ...common,
        mode: 'focused',
        reason: 'no runtime package owner changed; run governance canaries',
        affectedPackages: [],
        testFiles: [...MANDATORY_AFFECTED_TESTS],
        browserRequired: false,
      },
      inventory,
    );
  }
  if (testFiles.length > 250) {
    return finalizePlan(
      {
        ...common,
        mode: 'full',
        reason: `affected closure selected ${testFiles.length} node tests (safety ceiling 250)`,
        testFiles: [],
        browserRequired: true,
      },
      inventory,
    );
  }
  return finalizePlan(
    {
      ...common,
      mode: 'focused',
      reason: `canonical dependency closure selected ${affectedPackages.length} package(s)`,
      testFiles,
      browserRequired,
    },
    inventory,
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/** Parse an affected plan at a process/CI boundary and verify its cryptographic identity. */
export function parseAffectedTestPlan(value: unknown): AffectedTestPlan {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('affected plan must be an object');
  }
  const candidate = value as Record<string, unknown>;
  const expectedKeys = [
    'affectedPackages',
    'artifacts',
    'base',
    'browserRequired',
    'changedPathDigest',
    'changedPaths',
    'confidence',
    'estimatedCost',
    'headSha',
    'mode',
    'planId',
    'platforms',
    'prerequisites',
    'rationale',
    'reason',
    'requiredChecks',
    'risk',
    'schemaVersion',
    'testFiles',
    'testPartitions',
  ].sort();
  const actualKeys = Object.keys(candidate).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new TypeError(`affected plan keys are invalid: ${actualKeys.join(', ')}`);
  }
  if (candidate['schemaVersion'] !== 2) throw new TypeError('affected plan schemaVersion must be 2');
  if (candidate['mode'] !== 'focused' && candidate['mode'] !== 'full')
    throw new TypeError('affected plan mode is invalid');
  if (candidate['confidence'] !== 'high' && candidate['confidence'] !== 'low')
    throw new TypeError('affected plan confidence is invalid');
  for (const key of [
    'changedPaths',
    'affectedPackages',
    'testFiles',
    'rationale',
    'requiredChecks',
    'platforms',
    'artifacts',
  ]) {
    if (!isStringArray(candidate[key])) throw new TypeError(`affected plan ${key} must be strings`);
  }
  if (typeof candidate['reason'] !== 'string' || candidate['reason'].length === 0)
    throw new TypeError('affected plan reason is invalid');
  if (typeof candidate['browserRequired'] !== 'boolean')
    throw new TypeError('affected plan browserRequired is invalid');
  if (!/^sha256:[0-9a-f]{64}$/u.test(String(candidate['planId'])))
    throw new TypeError('affected plan planId is invalid');
  if (!/^sha256:[0-9a-f]{64}$/u.test(String(candidate['changedPathDigest'])))
    throw new TypeError('affected plan changedPathDigest is invalid');
  const prerequisites = candidate['prerequisites'];
  if (stableSerialize(prerequisites) !== stableSerialize(AFFECTED_PLAN_PREREQUISITES)) {
    throw new TypeError('affected plan must declare the canonical install and workspace-build prerequisites');
  }
  if (candidate['mode'] === 'full' && candidate['testFiles'].length !== 0)
    throw new TypeError('full affected plans must not carry focused tests');
  const { planId, ...unsigned } = candidate;
  if (planId !== digest(unsigned)) throw new TypeError('affected plan integrity digest does not match its bytes');
  if (candidate['changedPathDigest'] !== digest(candidate['changedPaths']))
    throw new TypeError('affected plan changed-path digest is stale');
  return candidate as unknown as AffectedTestPlan;
}

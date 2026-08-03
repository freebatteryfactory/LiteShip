/** Canonical package-DAG projection for conservative affected-test selection. @module */

import { createHash } from 'node:crypto';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import { executionPrerequisites, type ExecutionPrerequisite } from './execution-prerequisites.js';
import type { AssuranceLevel } from '../../packages/gauntlet/src/assurance.js';
import { PACKAGE_CATALOG, type PackageCatalogRecord } from '../package-catalog.js';
import { isNodeTestEntrypoint } from '../../packages/cli/src/internal/test-corpus.js';
import type { AssuranceInventory } from './assurance-inventory.js';

export type AffectedRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AffectedPlanConfidence = 'high' | 'low';

export interface AffectedPlanContext {
  readonly baseRef: string;
  readonly baseSha: string;
  readonly headSha: string;
  readonly confidence: AffectedPlanConfidence;
  readonly rationale?: readonly string[];
  /** The current zero-miss calibration that admitted focused selection. */
  readonly selectorCalibrationId?: `sha256:${string}` | null;
}

export interface AffectedTestPlan {
  readonly schemaVersion: 4;
  readonly planId: `sha256:${string}`;
  readonly base: { readonly ref: string; readonly sha: string };
  readonly headSha: string;
  readonly changedPathDigest: `sha256:${string}`;
  readonly mode: 'focused' | 'full';
  readonly reason: string;
  readonly confidence: AffectedPlanConfidence;
  readonly selectorCalibrationId: `sha256:${string}` | null;
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
    readonly benchmark: readonly string[];
    readonly browserRequired: boolean;
  };
  readonly browserRequired: boolean;
  readonly benchmarkRequired: boolean;
  readonly rustWasmRequired: boolean;
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
  baseSha: '0000000000000000000000000000000000000000',
  headSha: '0000000000000000000000000000000000000000',
  confidence: 'high',
  selectorCalibrationId: null,
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

function requiredCheckIds(
  browserRequired: boolean,
  benchmarkRequired: boolean,
  rustWasmRequired: boolean,
): readonly string[] {
  const ids = CHECK_REGISTRY.filter(
    (check) => check.contexts.includes('repository') && check.profiles.includes('quick'),
  ).map((check) => check.id);
  const required = new Set([...ids, 'check/test']);
  if (browserRequired) required.add('check/test-e2e');
  if (benchmarkRequired) required.add('check/bench');
  if (rustWasmRequired) {
    required.add('check/rustfmt');
    required.add('check/rust-wasm-qualification');
  }
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
  > & { readonly benchmarkFiles: readonly string[] },
  inventory: AssuranceInventory,
): AffectedTestPlan {
  const risk = riskFor(input.mode, input.changedPaths, input.affectedPackages, inventory, input.confidence);
  const { benchmarkFiles, ...planInput } = input;
  const unsigned: UnsignedAffectedTestPlan = {
    ...planInput,
    changedPathDigest: digest(input.changedPaths),
    risk,
    requiredChecks: requiredCheckIds(input.browserRequired, input.benchmarkRequired, input.rustWasmRequired),
    testPartitions: {
      node: input.testFiles,
      benchmark: benchmarkFiles,
      browserRequired: input.browserRequired,
    },
    platforms: input.browserRequired ? ['linux', 'win32', 'browser'] : ['linux', 'win32'],
    prerequisites: AFFECTED_PLAN_PREREQUISITES,
    artifacts: ['affected-plan', 'test-results'],
    estimatedCost: {
      selectedNodeTests:
        input.mode === 'full' ? inventory.nodeTestSelection.entrypoints.length : input.testFiles.length,
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
    schemaVersion: 4 as const,
    base: { ref: context.baseRef, sha: context.baseSha },
    headSha: context.headSha,
    confidence: context.confidence,
    selectorCalibrationId: context.selectorCalibrationId ?? null,
    rationale: [...(context.rationale ?? [])],
    changedPaths: normalized,
    affectedPackages,
  };
  if (broadPath !== undefined || context.confidence === 'low') {
    const reason =
      context.confidence === 'low'
        ? 'selector confidence is low; selected full authority'
        : `global authority changed: ${broadPath}`;
    return finalizePlan(
      {
        ...common,
        mode: 'full',
        reason,
        rationale: common.rationale,
        testFiles: [],
        benchmarkFiles: [],
        browserRequired: true,
        benchmarkRequired: true,
        rustWasmRequired: true,
      },
      inventory,
    );
  }

  const packageSet = new Set(affectedPackages);
  const ownedEvidence = inventory.packages
    .filter((entry) => packageSet.has(entry.name))
    .flatMap((entry) => entry.evidenceFiles);
  const knownEntrypoints = new Set(inventory.nodeTestSelection.entrypoints);
  const dependentEntrypoints = new Map(
    inventory.nodeTestSelection.dependents.map((entry) => [entry.path, entry.entrypoints] as const),
  );
  const changedEvidence = normalized.filter((path) => path.startsWith('tests/'));
  const changedNodeEntrypoints = changedEvidence.filter(
    (path) => knownEntrypoints.has(path) || isNodeTestEntrypoint(path),
  );
  const reverseClosedEntrypoints = changedEvidence.flatMap((path) => dependentEntrypoints.get(path) ?? []);
  const candidates = [
    ...new Set([
      ...MANDATORY_AFFECTED_TESTS,
      ...ownedEvidence.filter((path) => knownEntrypoints.has(path) || isNodeTestEntrypoint(path)),
      ...changedNodeEntrypoints,
      ...reverseClosedEntrypoints,
    ]),
  ].sort();
  const browserEvidence = [...ownedEvidence, ...changedEvidence].filter(
    (path) => path.startsWith('tests/browser/') || path.startsWith('tests/e2e/'),
  );
  const browserRequired = browserEvidence.length > 0;
  const benchmarkFiles = [
    ...new Set([...ownedEvidence, ...changedEvidence].filter((path) => path.endsWith('.bench.ts'))),
  ].sort();
  const benchmarkRequired = benchmarkFiles.length > 0;
  const rustWasmRequired = normalized.some(
    (path) =>
      path.startsWith('crates/') ||
      path === 'rust-toolchain.toml' ||
      /^packages\/core\/src\/.*wasm[^/]*\.[cm]?[jt]s$/u.test(path) ||
      /^tests\/(?:unit|property)\/core\/.*wasm[^/]*\.[cm]?[jt]s$/u.test(path),
  );
  const testFiles = candidates.filter(isNodeTestEntrypoint);
  const orphanEvidence = changedEvidence.find(
    (path) =>
      !isNodeTestEntrypoint(path) &&
      !path.startsWith('tests/browser/') &&
      !path.startsWith('tests/e2e/') &&
      !path.endsWith('.bench.ts') &&
      (dependentEntrypoints.get(path)?.length ?? 0) === 0,
  );
  if (orphanEvidence !== undefined) {
    return finalizePlan(
      {
        ...common,
        mode: 'full',
        reason: `test evidence has no executable authority: ${orphanEvidence}`,
        rationale: [...common.rationale, 'orphan evidence fails broad'],
        testFiles: [],
        benchmarkFiles: [],
        browserRequired: true,
        benchmarkRequired: true,
        rustWasmRequired: true,
      },
      inventory,
    );
  }
  const unknownRuntimePath = normalized.find(
    (path) =>
      /\.(?:[cm]?[jt]sx?|astro|css)$/u.test(path) && !path.startsWith('tests/') && !path.startsWith('packages/'),
  );
  if (unknownRuntimePath !== undefined) {
    return finalizePlan(
      {
        ...common,
        mode: 'full',
        reason: `runtime source has no package owner: ${unknownRuntimePath}`,
        rationale: [...common.rationale, 'unknown ownership fails broad'],
        testFiles: [],
        benchmarkFiles: [],
        browserRequired: true,
        benchmarkRequired: true,
        rustWasmRequired: true,
      },
      inventory,
    );
  }
  if (affectedPackages.length === 0 && changedEvidence.length === 0 && !benchmarkRequired && !rustWasmRequired) {
    return finalizePlan(
      {
        ...common,
        mode: 'focused',
        reason: 'no runtime package owner changed; run governance canaries',
        affectedPackages: [],
        testFiles: [...MANDATORY_AFFECTED_TESTS],
        benchmarkFiles: [],
        browserRequired: false,
        benchmarkRequired: false,
        rustWasmRequired: false,
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
        benchmarkFiles: [],
        browserRequired: true,
        benchmarkRequired: true,
        rustWasmRequired: true,
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
      benchmarkFiles,
      browserRequired,
      benchmarkRequired,
      rustWasmRequired,
    },
    inventory,
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function requireStringArray(candidate: Readonly<Record<string, unknown>>, key: string): readonly string[] {
  const value = candidate[key];
  if (!isStringArray(value)) throw new TypeError(`affected plan ${key} must be strings`);
  return value;
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function isSortedUnique(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! < value);
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
    'benchmarkRequired',
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
    'rustWasmRequired',
    'schemaVersion',
    'selectorCalibrationId',
    'testFiles',
    'testPartitions',
  ].sort();
  const actualKeys = Object.keys(candidate).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new TypeError(`affected plan keys are invalid: ${actualKeys.join(', ')}`);
  }
  if (candidate['schemaVersion'] !== 4) throw new TypeError('affected plan schemaVersion must be 4');
  if (candidate['mode'] !== 'focused' && candidate['mode'] !== 'full')
    throw new TypeError('affected plan mode is invalid');
  if (candidate['confidence'] !== 'high' && candidate['confidence'] !== 'low')
    throw new TypeError('affected plan confidence is invalid');
  const changedPaths = requireStringArray(candidate, 'changedPaths');
  const affectedPackages = requireStringArray(candidate, 'affectedPackages');
  const testFiles = requireStringArray(candidate, 'testFiles');
  requireStringArray(candidate, 'rationale');
  const requiredChecks = requireStringArray(candidate, 'requiredChecks');
  const platforms = requireStringArray(candidate, 'platforms');
  const artifacts = requireStringArray(candidate, 'artifacts');
  if (typeof candidate['reason'] !== 'string' || candidate['reason'].length === 0)
    throw new TypeError('affected plan reason is invalid');
  if (typeof candidate['browserRequired'] !== 'boolean')
    throw new TypeError('affected plan browserRequired is invalid');
  if (typeof candidate['benchmarkRequired'] !== 'boolean')
    throw new TypeError('affected plan benchmarkRequired is invalid');
  if (typeof candidate['rustWasmRequired'] !== 'boolean')
    throw new TypeError('affected plan rustWasmRequired is invalid');
  if (!/^sha256:[0-9a-f]{64}$/u.test(String(candidate['planId'])))
    throw new TypeError('affected plan planId is invalid');
  if (!/^sha256:[0-9a-f]{64}$/u.test(String(candidate['changedPathDigest'])))
    throw new TypeError('affected plan changedPathDigest is invalid');
  if (
    candidate['selectorCalibrationId'] !== null &&
    !/^sha256:[0-9a-f]{64}$/u.test(String(candidate['selectorCalibrationId']))
  ) {
    throw new TypeError('affected plan selector calibration id is invalid');
  }
  if (candidate['confidence'] === 'high' && candidate['selectorCalibrationId'] === null) {
    throw new TypeError('high-confidence affected plans require selector calibration evidence');
  }
  if (!hasExactKeys(candidate['base'], ['ref', 'sha'])) throw new TypeError('affected plan base is invalid');
  if (typeof candidate['base']['ref'] !== 'string' || typeof candidate['base']['sha'] !== 'string') {
    throw new TypeError('affected plan base values are invalid');
  }
  const gitObject = /^(?:[0-9a-f]{40}|[0-9a-f]{64}|unresolved)$/u;
  if (!gitObject.test(candidate['base']['sha']) || !gitObject.test(String(candidate['headSha']))) {
    throw new TypeError('affected plan Git identities are invalid');
  }
  if (
    candidate['confidence'] === 'high' &&
    (candidate['base']['sha'] === 'unresolved' || candidate['headSha'] === 'unresolved')
  ) {
    throw new TypeError('high-confidence affected plans require resolved Git identities');
  }
  if (
    !isSortedUnique(changedPaths) ||
    new Set(affectedPackages).size !== affectedPackages.length ||
    !isSortedUnique(testFiles)
  ) {
    throw new TypeError('affected plan path/test arrays must be sorted and package identities unique');
  }
  const packageNames = new Set<string>(PACKAGE_CATALOG.map((record) => record.name));
  if (affectedPackages.some((name) => !packageNames.has(name))) {
    throw new TypeError('affected plan references a foreign package');
  }
  const checkIds = new Set(CHECK_REGISTRY.map((check) => check.id));
  if (new Set(requiredChecks).size !== requiredChecks.length || requiredChecks.some((id) => !checkIds.has(id))) {
    throw new TypeError('affected plan references a duplicate or foreign check');
  }
  const expectedPlatforms = candidate['browserRequired'] ? ['linux', 'win32', 'browser'] : ['linux', 'win32'];
  if (stableSerialize(platforms) !== stableSerialize(expectedPlatforms)) {
    throw new TypeError('affected plan platforms do not match its browser authority');
  }
  if (stableSerialize(artifacts) !== stableSerialize(['affected-plan', 'test-results'])) {
    throw new TypeError('affected plan artifacts are invalid');
  }
  if (!hasExactKeys(candidate['risk'], ['level', 'highestAssurance', 'factors'])) {
    throw new TypeError('affected plan risk is invalid');
  }
  if (!['low', 'moderate', 'high', 'critical'].includes(String(candidate['risk']['level']))) {
    throw new TypeError('affected plan risk level is invalid');
  }
  if (
    !['L0', 'L1', 'L2', 'L3', 'L4'].includes(String(candidate['risk']['highestAssurance'])) ||
    !isStringArray(candidate['risk']['factors'])
  ) {
    throw new TypeError('affected plan risk evidence is invalid');
  }
  if (!hasExactKeys(candidate['testPartitions'], ['node', 'benchmark', 'browserRequired'])) {
    throw new TypeError('affected plan test partitions are invalid');
  }
  if (
    stableSerialize(candidate['testPartitions']['node']) !== stableSerialize(candidate['testFiles']) ||
    candidate['testPartitions']['browserRequired'] !== candidate['browserRequired'] ||
    !isStringArray(candidate['testPartitions']['benchmark']) ||
    !isSortedUnique(candidate['testPartitions']['benchmark']) ||
    candidate['testPartitions']['benchmark'].some((path) => !path.endsWith('.bench.ts')) ||
    (candidate['mode'] === 'focused' &&
      candidate['testPartitions']['benchmark'].length > 0 !== candidate['benchmarkRequired'])
  ) {
    throw new TypeError('affected plan test partitions are stale');
  }
  if (
    (candidate['browserRequired'] && !requiredChecks.includes('check/test-e2e')) ||
    (candidate['benchmarkRequired'] && !requiredChecks.includes('check/bench')) ||
    (candidate['rustWasmRequired'] &&
      (!requiredChecks.includes('check/rustfmt') || !requiredChecks.includes('check/rust-wasm-qualification'))) ||
    (candidate['mode'] === 'full' &&
      (!candidate['browserRequired'] || !candidate['benchmarkRequired'] || !candidate['rustWasmRequired']))
  ) {
    throw new TypeError('affected plan authority requirements are incomplete');
  }
  if (!hasExactKeys(candidate['estimatedCost'], ['selectedNodeTests', 'upperBoundMs'])) {
    throw new TypeError('affected plan estimated cost is invalid');
  }
  if (
    !Number.isSafeInteger(candidate['estimatedCost']['selectedNodeTests']) ||
    Number(candidate['estimatedCost']['selectedNodeTests']) < 0 ||
    !Number.isSafeInteger(candidate['estimatedCost']['upperBoundMs']) ||
    Number(candidate['estimatedCost']['upperBoundMs']) < 0
  ) {
    throw new TypeError('affected plan estimated cost values are invalid');
  }
  const prerequisites = candidate['prerequisites'];
  if (stableSerialize(prerequisites) !== stableSerialize(AFFECTED_PLAN_PREREQUISITES)) {
    throw new TypeError('affected plan must declare the canonical install and workspace-build prerequisites');
  }
  if (candidate['mode'] === 'full' && testFiles.length !== 0)
    throw new TypeError('full affected plans must not carry focused tests');
  const { planId, ...unsigned } = candidate;
  if (planId !== digest(unsigned)) throw new TypeError('affected plan integrity digest does not match its bytes');
  if (candidate['changedPathDigest'] !== digest(changedPaths))
    throw new TypeError('affected plan changed-path digest is stale');
  return candidate as unknown as AffectedTestPlan;
}

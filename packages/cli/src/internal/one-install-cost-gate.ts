/** Addressed baselines and deterministic admission for the one-install facade cost. @module */

import { createHash } from 'node:crypto';
import { IntegrityError } from '@liteship/error';
import type {
  ColdImportGraph,
  FacadeDependencyReason,
  OneInstallCostReport,
  PackedPackageCost,
} from './one-install-cost-evidence.js';

export const ONE_INSTALL_COST_BASELINE_SCHEMA_VERSION = 1 as const;
export const ONE_INSTALL_COST_BASELINE_PATH = 'benchmarks/one-install-cost-baseline.json' as const;
export const ONE_INSTALL_COST_REPORT_PATH = 'benchmarks/one-install-cost-report.json' as const;
export const ONE_INSTALL_COST_UPDATE_ENV = 'LITESHIP_UPDATE_ONE_INSTALL_COST_BASELINE' as const;
const BYTE_FLOOR = 1024 * 1024;
const RELATIVE_BUDGET = 0.05;
const SUPPORTED_ENVIRONMENT = Object.freeze({
  platforms: Object.freeze(['darwin', 'linux', 'win32'] as const),
  architectures: Object.freeze(['arm64', 'x64'] as const),
  minimumNodeMajor: 22,
  packageManager: 'pnpm',
  packageManagerMajors: Object.freeze([10, 11] as const),
});

export interface OneInstallCostBaselineUnsigned {
  readonly schemaVersion: typeof ONE_INSTALL_COST_BASELINE_SCHEMA_VERSION;
  readonly environmentPolicy: {
    readonly platforms: readonly string[];
    readonly architectures: readonly string[];
    readonly minimumNodeMajor: number;
    readonly packageManager: string;
    readonly packageManagerMajors: readonly number[];
  };
  readonly fleetPackageCount: 25;
  readonly total: {
    readonly compressedBytes: number;
    readonly unpackedBytes: number;
    readonly fileCount: number;
  };
  readonly packages: readonly PackedPackageCost[];
  readonly facadeDependencies: readonly FacadeDependencyReason[];
  readonly coldImports: readonly ColdImportGraph[];
  readonly duplicateExternalVersions: readonly { readonly package: string; readonly versions: readonly string[] }[];
}

export interface OneInstallCostBaseline extends OneInstallCostBaselineUnsigned {
  readonly baselineId: `sha256:${string}`;
}

export interface OneInstallCostFinding {
  readonly code:
    | 'foreign-environment'
    | 'fleet-total-regression'
    | 'package-regression'
    | 'facade-dependency-drift'
    | 'cold-import-drift'
    | 'duplicate-version-drift';
  readonly subject: string;
  readonly detail: string;
}

function fail(message: string): never {
  throw IntegrityError('one-install-cost-gate', message);
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(',')}}`;
}

function digest(value: OneInstallCostBaselineUnsigned): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`;
}

function major(value: string, label: string): number {
  const match = /^(?:v)?([0-9]+)(?:\.|$)/u.exec(value);
  if (match?.[1] === undefined) return fail(`${label} has no semantic major: ${value}`);
  return Number(match[1]);
}

function environmentIsSupported(environment: OneInstallCostReport['observation']['environment']): boolean {
  return (
    SUPPORTED_ENVIRONMENT.platforms.includes(environment.platform as 'darwin' | 'linux' | 'win32') &&
    SUPPORTED_ENVIRONMENT.architectures.includes(environment.architecture as 'arm64' | 'x64') &&
    major(environment.nodeVersion, 'Node version') >= SUPPORTED_ENVIRONMENT.minimumNodeMajor &&
    environment.packageManager === SUPPORTED_ENVIRONMENT.packageManager &&
    SUPPORTED_ENVIRONMENT.packageManagerMajors.includes(
      major(environment.packageManagerVersion, 'package-manager version') as 10 | 11,
    )
  );
}

function sortedPackages(packages: readonly PackedPackageCost[]): readonly PackedPackageCost[] {
  return [...packages].map((entry) => ({ ...entry })).sort((a, b) => a.package.localeCompare(b.package));
}

function sortedDependencies(dependencies: readonly FacadeDependencyReason[]): readonly FacadeDependencyReason[] {
  return [...dependencies].map((entry) => ({ ...entry })).sort((a, b) => a.package.localeCompare(b.package));
}

function sortedColdImports(imports: readonly ColdImportGraph[]): readonly ColdImportGraph[] {
  return [...imports]
    .map((entry) => ({
      ...entry,
      packages: [...entry.packages].sort(),
      modules: [...entry.modules]
        .map((module) => ({ ...module }))
        .sort((left, right) => stable(left).localeCompare(stable(right))),
    }))
    .sort((a, b) => a.specifier.localeCompare(b.specifier));
}

/** Freeze the current qualified observation as a reviewable, content-addressed budget owner. */
export function buildOneInstallCostBaseline(report: OneInstallCostReport): OneInstallCostBaseline {
  if (!environmentIsSupported(report.observation.environment)) {
    return fail('cannot mint a baseline from an unsupported platform/toolchain observation');
  }
  const unsigned: OneInstallCostBaselineUnsigned = {
    schemaVersion: ONE_INSTALL_COST_BASELINE_SCHEMA_VERSION,
    environmentPolicy: { ...SUPPORTED_ENVIRONMENT },
    fleetPackageCount: report.semanticIdentity.fleetPackageCount,
    total: {
      compressedBytes: report.observation.compressedTarballs.totalBytes,
      unpackedBytes: report.observation.compressedTarballs.totalUnpackedBytes,
      fileCount: report.observation.compressedTarballs.totalFileCount,
    },
    packages: sortedPackages(report.observation.compressedTarballs.packages),
    facadeDependencies: sortedDependencies(report.observation.facadeDependencies),
    coldImports: sortedColdImports(report.observation.coldImports),
    duplicateExternalVersions: [...report.observation.installed.duplicateExternalVersions]
      .map((entry) => ({ package: entry.package, versions: [...entry.versions].sort() }))
      .sort((a, b) => a.package.localeCompare(b.package)),
  };
  return Object.freeze({ ...unsigned, baselineId: digest(unsigned) });
}

/** Strictly re-address a parsed baseline before it can govern a release. */
export function parseOneInstallCostBaseline(value: unknown): OneInstallCostBaseline {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail('baseline must be an object');
  const candidate = value as Partial<OneInstallCostBaseline>;
  const actual = Object.keys(candidate).sort();
  const expected = [
    'schemaVersion',
    'baselineId',
    'environmentPolicy',
    'fleetPackageCount',
    'total',
    'packages',
    'facadeDependencies',
    'coldImports',
    'duplicateExternalVersions',
  ].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) return fail('baseline keys are invalid');
  if (candidate.schemaVersion !== 1 || candidate.fleetPackageCount !== 25 || typeof candidate.baselineId !== 'string') {
    return fail('baseline envelope is invalid');
  }
  const rebuilt = buildOneInstallCostBaseline({
    schemaVersion: 1,
    generatedAt: 'baseline-rebuild',
    methodology: {
      fleetIdentity: 'baseline-rebuild',
      compressedTarballs: 'baseline-rebuild',
      installedFootprint: 'baseline-rebuild',
      packageCensus: 'baseline-rebuild',
      authority: 'addressed-baseline-gated',
    },
    semanticIdentity: {
      fleetPackageCount: 25,
      fleetPackages: candidate.packages?.map((entry) => entry.package) ?? [],
    },
    observation: {
      environment: {
        platform: candidate.environmentPolicy?.platforms?.[0] ?? '',
        architecture: candidate.environmentPolicy?.architectures?.[0] ?? '',
        nodeVersion: `v${String(candidate.environmentPolicy?.minimumNodeMajor ?? '')}`,
        packageManager: candidate.environmentPolicy?.packageManager ?? '',
        packageManagerVersion: String(candidate.environmentPolicy?.packageManagerMajors?.[0] ?? ''),
      },
      compressedTarballs: {
        packageCount: 25,
        totalBytes: candidate.total?.compressedBytes ?? -1,
        totalUnpackedBytes: candidate.total?.unpackedBytes ?? -1,
        totalFileCount: candidate.total?.fileCount ?? -1,
        packages: candidate.packages ?? [],
      },
      installed: {
        uniqueRegularFileBytes: 0,
        uniqueRegularFileCount: 0,
        directoryCount: 0,
        symlinkCount: 0,
        packageInstanceCount: 25 + (candidate.duplicateExternalVersions?.length ?? 0),
        fleetPackageCount: 25,
        fleetPackageInstanceCount: 25,
        externalDependencyCount: candidate.duplicateExternalVersions?.length ?? 0,
        externalPackageInstanceCount: candidate.duplicateExternalVersions?.length ?? 0,
        externalDependencies: candidate.duplicateExternalVersions?.map((entry) => entry.package) ?? [],
        externalVersions:
          candidate.duplicateExternalVersions?.map((entry) => ({
            package: entry.package,
            versions: entry.versions,
            instances: entry.versions.length,
          })) ?? [],
        duplicateExternalVersions: candidate.duplicateExternalVersions ?? [],
      },
      facadeDependencies: candidate.facadeDependencies ?? [],
      coldImports: candidate.coldImports ?? [],
    },
  });
  if (stable(candidate.environmentPolicy) !== stable(SUPPORTED_ENVIRONMENT)) {
    return fail('baseline environment policy is invalid');
  }
  if (rebuilt.baselineId !== candidate.baselineId) return fail('baseline semantic identity is invalid');
  return Object.freeze(candidate as OneInstallCostBaseline);
}

function byteLimit(baseline: number): number {
  return baseline + Math.max(BYTE_FLOOR, Math.ceil(baseline * RELATIVE_BUDGET));
}

function countLimit(baseline: number): number {
  return baseline + Math.max(10, Math.ceil(baseline * RELATIVE_BUDGET));
}

/** Compare one qualified observation to the exact approved baseline without ambient state. */
export function oneInstallCostFindings(
  report: OneInstallCostReport,
  baseline: OneInstallCostBaseline,
): readonly OneInstallCostFinding[] {
  parseOneInstallCostBaseline(baseline);
  const findings: OneInstallCostFinding[] = [];
  const environment = report.observation.environment;
  if (!environmentIsSupported(environment)) {
    findings.push({
      code: 'foreign-environment',
      subject: 'environment',
      detail: 'observation is outside the approved platform/toolchain envelope',
    });
    return findings;
  }

  const totals = report.observation.compressedTarballs;
  for (const [name, observed, approved] of [
    ['compressedBytes', totals.totalBytes, baseline.total.compressedBytes],
    ['unpackedBytes', totals.totalUnpackedBytes, baseline.total.unpackedBytes],
  ] as const) {
    if (observed > byteLimit(approved))
      findings.push({
        code: 'fleet-total-regression',
        subject: name,
        detail: `${observed} exceeds ${byteLimit(approved)}`,
      });
  }
  if (totals.totalFileCount > countLimit(baseline.total.fileCount)) {
    findings.push({
      code: 'fleet-total-regression',
      subject: 'fileCount',
      detail: `${totals.totalFileCount} exceeds ${countLimit(baseline.total.fileCount)}`,
    });
  }

  const baselinePackages = new Map(baseline.packages.map((entry) => [entry.package, entry]));
  for (const observed of totals.packages) {
    const approved = baselinePackages.get(observed.package);
    if (approved === undefined) {
      findings.push({
        code: 'package-regression',
        subject: observed.package,
        detail: 'package is absent from the approved baseline',
      });
      continue;
    }
    if (
      observed.compressedBytes > byteLimit(approved.compressedBytes) ||
      observed.unpackedBytes > byteLimit(approved.unpackedBytes) ||
      observed.fileCount > countLimit(approved.fileCount)
    ) {
      findings.push({
        code: 'package-regression',
        subject: observed.package,
        detail: 'packed size or file count exceeds the approved budget',
      });
    }
  }

  if (stable(sortedDependencies(report.observation.facadeDependencies)) !== stable(baseline.facadeDependencies)) {
    findings.push({
      code: 'facade-dependency-drift',
      subject: 'liteship',
      detail: 'facade dependencies or their capability reasons changed',
    });
  }

  const approvedGraphs = new Map(baseline.coldImports.map((entry) => [entry.specifier, entry]));
  for (const observed of report.observation.coldImports) {
    const approved = approvedGraphs.get(observed.specifier);
    if (approved === undefined) {
      findings.push({
        code: 'cold-import-drift',
        subject: observed.specifier,
        detail: 'facade subpath has no approved cold-import graph',
      });
      continue;
    }
    const approvedModules = new Set(approved.modules.map((entry) => stable(entry)));
    const foreign = observed.modules.filter((entry) => !approvedModules.has(stable(entry)));
    if (foreign.length > 0 || observed.moduleCount > countLimit(approved.moduleCount)) {
      findings.push({
        code: 'cold-import-drift',
        subject: observed.specifier,
        detail: `${foreign.length} unapproved modules; observed ${observed.moduleCount}, baseline ${approved.moduleCount}`,
      });
    }
  }
  const observedSpecifiers = new Set(report.observation.coldImports.map((entry) => entry.specifier));
  for (const approved of baseline.coldImports) {
    if (!observedSpecifiers.has(approved.specifier)) {
      findings.push({
        code: 'cold-import-drift',
        subject: approved.specifier,
        detail: 'approved facade subpath is absent from the observed cold-import census',
      });
    }
  }

  const approvedDuplicates = new Set(baseline.duplicateExternalVersions.map((entry) => stable(entry)));
  for (const observed of report.observation.installed.duplicateExternalVersions) {
    if (!approvedDuplicates.has(stable(observed))) {
      findings.push({
        code: 'duplicate-version-drift',
        subject: observed.package,
        detail: `unapproved duplicate versions: ${observed.versions.join(', ')}`,
      });
    }
  }
  return Object.freeze(findings);
}

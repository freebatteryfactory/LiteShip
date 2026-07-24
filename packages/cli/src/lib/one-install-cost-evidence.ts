/**
 * Deterministic one-install cost evidence over package-smoke's existing packed
 * tarballs and installed consumer tree. This module measures; it never packs,
 * installs, or decides a performance budget.
 *
 * @module
 */
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { IntegrityError } from '@liteship/error';

export const ONE_INSTALL_COST_SCHEMA_VERSION = 1 as const;
export const ONE_INSTALL_FLEET_PACKAGE_COUNT = 25 as const;

export interface CostEvidenceEnvironment {
  readonly platform: string;
  readonly architecture: string;
  readonly nodeVersion: string;
  readonly packageManager: string;
}

export interface InstalledTreeStat {
  readonly kind: 'directory' | 'file' | 'symlink' | 'other';
  readonly bytes: number;
  readonly device: number;
  readonly inode: number;
}

export interface InstalledTreeReader {
  readonly entries: (directory: string) => readonly string[];
  readonly stat: (path: string) => InstalledTreeStat;
  readonly readText: (path: string) => string;
}

export interface InstalledCostObservation {
  readonly uniqueRegularFileBytes: number;
  readonly uniqueRegularFileCount: number;
  readonly directoryCount: number;
  readonly symlinkCount: number;
  readonly packageInstanceCount: number;
  readonly fleetPackageCount: number;
  readonly fleetPackageInstanceCount: number;
  readonly externalDependencyCount: number;
  readonly externalPackageInstanceCount: number;
  readonly externalDependencies: readonly string[];
}

export interface OneInstallCostReport {
  readonly schemaVersion: typeof ONE_INSTALL_COST_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly methodology: {
    readonly fleetIdentity: string;
    readonly compressedTarballs: string;
    readonly installedFootprint: string;
    readonly packageCensus: string;
    readonly authority: 'observational-no-threshold';
  };
  readonly semanticIdentity: {
    readonly fleetPackageCount: typeof ONE_INSTALL_FLEET_PACKAGE_COUNT;
    readonly fleetPackages: readonly string[];
  };
  readonly observation: {
    readonly environment: CostEvidenceEnvironment;
    readonly compressedTarballs: {
      readonly packageCount: typeof ONE_INSTALL_FLEET_PACKAGE_COUNT;
      readonly totalBytes: number;
      readonly packages: readonly { readonly package: string; readonly bytes: number }[];
    };
    readonly installed: InstalledCostObservation;
  };
}

interface PackageInstance {
  readonly path: string;
  readonly name: string;
}

function fail(message: string): never {
  throw IntegrityError('one-install-cost-evidence', message);
}

function normalized(path: string): string {
  return path.replace(/\\/g, '/');
}

function safeBytes(value: number, label: string, allowZero: boolean): number {
  if (!Number.isSafeInteger(value) || value < 0 || (!allowZero && value === 0)) {
    return fail(`${label} must be ${allowZero ? 'a non-negative' : 'a positive'} safe integer byte count`);
  }
  return value;
}

function physicalIdentity(path: string, stat: InstalledTreeStat): string {
  return stat.device > 0 && stat.inode > 0
    ? `${stat.kind}:${stat.device}:${stat.inode}`
    : `${stat.kind}:path:${normalized(path)}`;
}

const nodeReader: InstalledTreeReader = {
  entries: (directory) => readdirSync(directory, { withFileTypes: true }).map((entry) => entry.name),
  stat: (path) => {
    const stat = lstatSync(path);
    return {
      kind: stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other',
      bytes: stat.size,
      device: stat.dev,
      inode: stat.ino,
    };
  },
  readText: (path) => readFileSync(path, 'utf8'),
};

/**
 * Walk an installed tree without following links. Directory and regular-file
 * physical identities are deduplicated, so junction cycles and hard-linked pnpm
 * content cannot inflate the observation.
 */
export function measureInstalledTree(
  nodeModulesRoot: string,
  fleetPackages: readonly string[],
  reader: InstalledTreeReader = nodeReader,
): InstalledCostObservation {
  const root = resolve(nodeModulesRoot);
  const pending = [root];
  const seenDirectories = new Set<string>();
  const seenFiles = new Map<string, number>();
  const packageInstances: PackageInstance[] = [];
  let directoryCount = 0;
  let symlinkCount = 0;

  while (pending.length > 0) {
    const current = pending.pop()!;
    const stat = reader.stat(current);
    if (stat.kind === 'symlink') {
      symlinkCount += 1;
      continue;
    }
    if (stat.kind === 'directory') {
      const identity = physicalIdentity(current, stat);
      if (seenDirectories.has(identity)) continue;
      seenDirectories.add(identity);
      directoryCount += 1;
      const children = [...reader.entries(current)].sort((a, b) => b.localeCompare(a));
      for (const name of children) pending.push(join(current, name));
      continue;
    }
    if (stat.kind !== 'file') continue;
    const bytes = safeBytes(stat.bytes, normalized(relative(root, current)), true);
    const identity = physicalIdentity(current, stat);
    const previousBytes = seenFiles.get(identity);
    if (previousBytes !== undefined && previousBytes !== bytes) {
      fail(`physical file identity ${identity} reported conflicting byte counts`);
    }
    seenFiles.set(identity, bytes);
    if (basename(current) === 'package.json') {
      let manifest: unknown;
      try {
        manifest = JSON.parse(reader.readText(current)) as unknown;
      } catch (error) {
        fail(`installed manifest ${normalized(relative(root, current))} is invalid JSON: ${String(error)}`);
      }
      if (typeof manifest === 'object' && manifest !== null && !Array.isArray(manifest)) {
        const name = (manifest as Record<string, unknown>)['name'];
        if (typeof name === 'string' && name.length > 0) {
          packageInstances.push({ path: normalized(relative(root, current)), name });
        }
      }
    }
  }

  const expected = new Set(fleetPackages);
  const installedFleet = new Set(
    packageInstances.filter((entry) => expected.has(entry.name)).map((entry) => entry.name),
  );
  const missing = [...expected].filter((name) => !installedFleet.has(name)).sort();
  if (missing.length > 0) fail(`installed consumer is missing fleet package(s): ${missing.join(', ')}`);
  const externalInstances = packageInstances.filter((entry) => !expected.has(entry.name));
  const externalDependencies = [...new Set(externalInstances.map((entry) => entry.name))].sort((a, b) =>
    a.localeCompare(b),
  );

  return {
    uniqueRegularFileBytes: [...seenFiles.values()].reduce((total, bytes) => total + bytes, 0),
    uniqueRegularFileCount: seenFiles.size,
    directoryCount,
    symlinkCount,
    packageInstanceCount: packageInstances.length,
    fleetPackageCount: installedFleet.size,
    fleetPackageInstanceCount: packageInstances.length - externalInstances.length,
    externalDependencyCount: externalDependencies.length,
    externalPackageInstanceCount: externalInstances.length,
    externalDependencies,
  };
}

/** Pure schema/ordering/coverage fold over already-observed pack and install data. */
export function buildOneInstallCostReport(input: {
  readonly generatedAt: string;
  readonly environment: CostEvidenceEnvironment;
  readonly fleetPackages: readonly string[];
  readonly tarballs: readonly { readonly package: string; readonly bytes: number }[];
  readonly installed: InstalledCostObservation;
}): OneInstallCostReport {
  const fleetPackages = [...input.fleetPackages].sort((a, b) => a.localeCompare(b));
  if (
    fleetPackages.length !== ONE_INSTALL_FLEET_PACKAGE_COUNT ||
    new Set(fleetPackages).size !== fleetPackages.length ||
    fleetPackages.some((name) => name.length === 0)
  ) {
    fail(`fleet identity must contain exactly ${ONE_INSTALL_FLEET_PACKAGE_COUNT} unique packages`);
  }
  const expected = new Set(fleetPackages);
  const tarballs = input.tarballs
    .map((entry) => ({ package: entry.package, bytes: safeBytes(entry.bytes, `${entry.package} tarball`, false) }))
    .sort((a, b) => a.package.localeCompare(b.package));
  const tarballNames = tarballs.map((entry) => entry.package);
  if (
    tarballs.length !== ONE_INSTALL_FLEET_PACKAGE_COUNT ||
    new Set(tarballNames).size !== tarballNames.length ||
    tarballNames.some((name) => !expected.has(name)) ||
    fleetPackages.some((name) => !tarballNames.includes(name))
  ) {
    fail('compressed tarball census must equal the exact 25-package fleet identity');
  }
  if (input.installed.fleetPackageCount !== ONE_INSTALL_FLEET_PACKAGE_COUNT) {
    fail(`installed fleet count is stale: expected 25, observed ${input.installed.fleetPackageCount}`);
  }
  const installedCounts = [
    ['installed unique regular-file bytes', input.installed.uniqueRegularFileBytes],
    ['installed unique regular-file count', input.installed.uniqueRegularFileCount],
    ['installed directory count', input.installed.directoryCount],
    ['installed symlink count', input.installed.symlinkCount],
    ['installed package instance count', input.installed.packageInstanceCount],
    ['installed fleet package count', input.installed.fleetPackageCount],
    ['installed fleet package instance count', input.installed.fleetPackageInstanceCount],
    ['installed external dependency count', input.installed.externalDependencyCount],
    ['installed external package instance count', input.installed.externalPackageInstanceCount],
  ] as const;
  for (const [label, value] of installedCounts) safeBytes(value, label, true);
  const externalDependencies = [...input.installed.externalDependencies].sort((a, b) => a.localeCompare(b));
  if (
    externalDependencies.some((name) => name.length === 0) ||
    new Set(externalDependencies).size !== externalDependencies.length ||
    input.installed.externalDependencyCount !== externalDependencies.length ||
    input.installed.packageInstanceCount !==
      input.installed.fleetPackageInstanceCount + input.installed.externalPackageInstanceCount ||
    input.installed.fleetPackageInstanceCount < input.installed.fleetPackageCount
  ) {
    fail('installed package census is internally inconsistent');
  }
  const totalBytes = tarballs.reduce((total, entry) => total + entry.bytes, 0);
  safeBytes(totalBytes, 'compressed tarball total', false);

  return {
    schemaVersion: ONE_INSTALL_COST_SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    methodology: {
      fleetIdentity: 'Exact sorted names supplied by package-smoke PACKAGES; exactly 25 unique packages are required.',
      compressedTarballs:
        "Per-package compressed bytes are fs.stat.size over package-smoke's already-produced .tgz files.",
      installedFootprint:
        'Recursive lstat walk of consumer/node_modules; links are counted but never followed, directories and regular files are deduplicated by device/inode with normalized-path fallback, and bytes are unique regular-file content bytes rather than allocated blocks.',
      packageCensus:
        'Physical package.json instances under the walked tree are classified by manifest name into fleet or external packages; unique external names and physical instances are both reported.',
      authority: 'observational-no-threshold',
    },
    semanticIdentity: {
      fleetPackageCount: ONE_INSTALL_FLEET_PACKAGE_COUNT,
      fleetPackages,
    },
    observation: {
      environment: { ...input.environment },
      compressedTarballs: {
        packageCount: ONE_INSTALL_FLEET_PACKAGE_COUNT,
        totalBytes,
        packages: tarballs,
      },
      installed: {
        ...input.installed,
        externalDependencies,
      },
    },
  };
}

/** Measure package-smoke's existing tarballs and installed consumer; performs no pack/install work. */
export function measureOneInstallCostReport(input: {
  readonly generatedAt: string;
  readonly environment: CostEvidenceEnvironment;
  readonly fleetPackages: readonly string[];
  readonly tarballs: ReadonlyMap<string, string>;
  readonly consumerDir: string;
}): OneInstallCostReport {
  const tarballs = [...input.tarballs].map(([packageName, path]) => ({
    package: packageName,
    bytes: statSync(path).size,
  }));
  const installed = measureInstalledTree(join(input.consumerDir, 'node_modules'), input.fleetPackages);
  return buildOneInstallCostReport({
    generatedAt: input.generatedAt,
    environment: input.environment,
    fleetPackages: input.fleetPackages,
    tarballs,
    installed,
  });
}

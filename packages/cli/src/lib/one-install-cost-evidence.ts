/**
 * Deterministic one-install cost evidence over package-smoke's existing packed
 * tarballs and installed consumer tree. This module measures; it never packs,
 * installs, or decides a performance budget.
 *
 * @module
 */
import { gunzipSync } from 'node:zlib';
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { IntegrityError } from '@liteship/error';

export const ONE_INSTALL_COST_SCHEMA_VERSION = 1 as const;
export const ONE_INSTALL_FLEET_PACKAGE_COUNT = 25 as const;

export interface CostEvidenceEnvironment {
  readonly platform: string;
  readonly architecture: string;
  readonly nodeVersion: string;
  readonly packageManager: string;
  readonly packageManagerVersion: string;
}

export interface InstalledTreeStat {
  readonly kind: 'directory' | 'file' | 'symlink' | 'other';
  readonly bytes: number;
  /** Lossless decimal identity from bigint stat fields. */
  readonly device: string;
  readonly inode: string;
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
  readonly externalVersions: readonly {
    readonly package: string;
    readonly versions: readonly string[];
    readonly instances: number;
  }[];
  readonly duplicateExternalVersions: readonly { readonly package: string; readonly versions: readonly string[] }[];
}

export interface PackedPackageCost {
  readonly package: string;
  readonly compressedBytes: number;
  readonly unpackedBytes: number;
  readonly fileCount: number;
}

export interface ColdImportModule {
  readonly package: string;
  readonly version: string;
  readonly path: string;
}

export interface ColdImportGraph {
  readonly specifier: string;
  readonly moduleCount: number;
  readonly packageCount: number;
  readonly packages: readonly string[];
  readonly modules: readonly ColdImportModule[];
}

export interface FacadeDependencyReason {
  readonly package: string;
  readonly reason: string;
}

/** Stable Node inspector probe used to observe modules parsed by one cold facade import. */
export const COLD_IMPORT_PROBE_SOURCE = [
  "import inspector from 'node:inspector';",
  "import { fileURLToPath } from 'node:url';",
  'const session = new inspector.Session();',
  'session.connect();',
  'const paths = new Set();',
  "session.on('Debugger.scriptParsed', ({ params }) => {",
  "  if (params.url.startsWith('file:')) paths.add(fileURLToPath(params.url));",
  '});',
  "await new Promise((resolve, reject) => session.post('Debugger.enable', (error) => error ? reject(error) : resolve()));",
  'await import(process.argv[2]);',
  'await new Promise((resolve) => setImmediate(resolve));',
  "await new Promise((resolve, reject) => session.post('Debugger.disable', (error) => error ? reject(error) : resolve()));",
  'session.disconnect();',
  'process.stdout.write(JSON.stringify([...paths].sort()));',
  '',
].join('\n');

export interface OneInstallCostReport {
  readonly schemaVersion: typeof ONE_INSTALL_COST_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly methodology: {
    readonly fleetIdentity: string;
    readonly compressedTarballs: string;
    readonly installedFootprint: string;
    readonly packageCensus: string;
    readonly authority: 'addressed-baseline-gated';
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
      readonly totalUnpackedBytes: number;
      readonly totalFileCount: number;
      readonly packages: readonly PackedPackageCost[];
    };
    readonly installed: InstalledCostObservation;
    readonly facadeDependencies: readonly FacadeDependencyReason[];
    readonly coldImports: readonly ColdImportGraph[];
  };
}

interface PackageInstance {
  readonly path: string;
  readonly name: string;
  readonly version: string;
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
  return stat.device !== '0' && stat.inode !== '0'
    ? `${stat.kind}:${stat.device}:${stat.inode}`
    : `${stat.kind}:path:${normalized(path)}`;
}

function isPackageRootManifest(nodeModulesRoot: string, manifestPath: string): boolean {
  const manifestRelative = normalized(relative(nodeModulesRoot, manifestPath));
  const parts = manifestRelative.split('/');
  if (parts.pop() !== 'package.json') return false;
  const lastNodeModules = parts.lastIndexOf('node_modules');
  const packageParts = lastNodeModules < 0 ? parts : parts.slice(lastNodeModules + 1);
  return packageParts[0]?.startsWith('@') === true ? packageParts.length === 2 : packageParts.length === 1;
}

const nodeReader: InstalledTreeReader = {
  entries: (directory) => readdirSync(directory, { withFileTypes: true }).map((entry) => entry.name),
  stat: (path) => {
    const stat = lstatSync(path, { bigint: true });
    if (stat.size > BigInt(Number.MAX_SAFE_INTEGER)) fail(`${normalized(path)} exceeds safe installed byte accounting`);
    return {
      kind: stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other',
      bytes: Number(stat.size),
      device: stat.dev.toString(),
      inode: stat.ino.toString(),
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
    if (basename(current) === 'package.json' && isPackageRootManifest(root, current)) {
      let manifest: unknown;
      try {
        manifest = JSON.parse(reader.readText(current)) as unknown;
      } catch (error) {
        fail(`installed manifest ${normalized(relative(root, current))} is invalid JSON: ${String(error)}`);
      }
      if (typeof manifest === 'object' && manifest !== null && !Array.isArray(manifest)) {
        const name = (manifest as Record<string, unknown>)['name'];
        const version = (manifest as Record<string, unknown>)['version'];
        if (typeof name === 'string' && name.length > 0) {
          if (typeof version !== 'string' || version.length === 0) {
            fail(`installed manifest ${normalized(relative(root, current))} has a package name but no version`);
          }
          packageInstances.push({ path: normalized(relative(root, current)), name, version });
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
  const externalVersions = externalDependencies.map((packageName) => {
    const instances = externalInstances.filter((entry) => entry.name === packageName);
    return {
      package: packageName,
      versions: [...new Set(instances.map((entry) => entry.version))].sort((a, b) => a.localeCompare(b)),
      instances: instances.length,
    };
  });
  const duplicateExternalVersions = externalVersions
    .filter((entry) => entry.versions.length > 1)
    .map(({ package: packageName, versions }) => ({ package: packageName, versions }));

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
    externalVersions,
    duplicateExternalVersions,
  };
}

function tarOctal(field: Uint8Array, label: string): number {
  const text = Buffer.from(field).toString('ascii').replaceAll('\0', '').trim();
  if (!/^[0-7]+$/u.test(text)) fail(`${label} is not an octal tar field`);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} exceeds safe tar accounting`);
  return value;
}

/** Measure regular-file payload bytes from one npm-compatible gzip tarball. */
export function measurePackedTarball(tarballPath: string, packageName: string): PackedPackageCost {
  const compressedBytes = safeBytes(statSync(tarballPath).size, `${packageName} tarball`, false);
  let archive: Buffer;
  try {
    archive = gunzipSync(readFileSync(tarballPath));
  } catch (error) {
    return fail(`${packageName} tarball is not valid gzip: ${String(error)}`);
  }
  let offset = 0;
  let unpackedBytes = 0;
  let fileCount = 0;
  let terminated = false;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      terminated = true;
      break;
    }
    const expectedChecksum = tarOctal(header.subarray(148, 156), `${packageName} tar entry checksum`);
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const observedChecksum = checksumHeader.reduce((total, byte) => total + byte, 0);
    if (observedChecksum !== expectedChecksum) fail(`${packageName} tar entry checksum is invalid`);
    const size = tarOctal(header.subarray(124, 136), `${packageName} tar entry size`);
    const type = String.fromCharCode(header[156] ?? 0);
    const padded = Math.ceil(size / 512) * 512;
    if (offset + 512 + padded > archive.length) fail(`${packageName} tar entry escapes the archive`);
    if (type === '\0' || type === '0') {
      unpackedBytes += size;
      fileCount += 1;
      safeBytes(unpackedBytes, `${packageName} unpacked total`, true);
    }
    offset += 512 + padded;
  }
  if (!terminated || fileCount === 0) fail(`${packageName} tarball has no complete regular-file payload`);
  return { package: packageName, compressedBytes, unpackedBytes, fileCount };
}

function packageCoordinates(
  path: string,
  nodeModulesRoot: string,
): { root: string; package: string; modulePath: string } | null {
  const physicalPath = resolve(path);
  const fromRoot = relative(resolve(nodeModulesRoot), physicalPath);
  if (fromRoot === '' || fromRoot.startsWith('..') || isAbsolute(fromRoot)) return null;
  const normalizedPath = normalized(physicalPath);
  const marker = '/node_modules/';
  const markerIndex = normalizedPath.lastIndexOf(marker);
  if (markerIndex < 0) return null;
  const prefix = normalizedPath.slice(0, markerIndex + marker.length);
  const remainder = normalizedPath.slice(markerIndex + marker.length);
  const parts = remainder.split('/');
  const packageParts = parts[0]?.startsWith('@') ? parts.slice(0, 2) : parts.slice(0, 1);
  if (packageParts.length === 0 || packageParts.some((part) => part === undefined || part.length === 0)) return null;
  const packageName = packageParts.join('/');
  const modulePath = parts.slice(packageParts.length).join('/');
  return { root: `${prefix}${packageName}`, package: packageName, modulePath };
}

/** Normalize inspector script URLs into a stable package-relative cold-import graph. */
export function buildColdImportGraph(input: {
  readonly specifier: string;
  readonly nodeModulesRoot: string;
  readonly scriptPaths: readonly string[];
}): ColdImportGraph {
  if (input.specifier.trim() !== input.specifier || input.specifier.length === 0) {
    fail('cold-import specifier must be a non-empty trimmed string');
  }
  const modules = new Map<string, ColdImportModule>();
  for (const scriptPath of input.scriptPaths) {
    const coordinates = packageCoordinates(scriptPath, input.nodeModulesRoot);
    if (coordinates === null || coordinates.modulePath.length === 0) continue;
    let manifest: unknown;
    try {
      manifest = JSON.parse(readFileSync(join(coordinates.root, 'package.json'), 'utf8')) as unknown;
    } catch (error) {
      fail(`cold-import package ${coordinates.package} has no readable manifest: ${String(error)}`);
    }
    if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
      fail(`cold-import package ${coordinates.package} manifest is not an object`);
    }
    const name = (manifest as Record<string, unknown>)['name'];
    const version = (manifest as Record<string, unknown>)['version'];
    if (name !== coordinates.package || typeof version !== 'string' || version.length === 0) {
      fail(`cold-import package ${coordinates.package} manifest identity is invalid`);
    }
    const entry = { package: coordinates.package, version, path: coordinates.modulePath };
    modules.set(`${entry.package}\0${entry.version}\0${entry.path}`, entry);
  }
  const ordered = [...modules.values()].sort(
    (left, right) =>
      left.package.localeCompare(right.package) ||
      left.version.localeCompare(right.version) ||
      left.path.localeCompare(right.path),
  );
  if (ordered.length === 0) fail(`cold-import graph for ${input.specifier} observed no packed modules`);
  const packages = [...new Set(ordered.map((entry) => `${entry.package}@${entry.version}`))].sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    specifier: input.specifier,
    moduleCount: ordered.length,
    packageCount: packages.length,
    packages,
    modules: ordered,
  };
}

/** Pure schema/ordering/coverage fold over already-observed pack and install data. */
export function buildOneInstallCostReport(input: {
  readonly generatedAt: string;
  readonly environment: CostEvidenceEnvironment;
  readonly fleetPackages: readonly string[];
  readonly tarballs: readonly PackedPackageCost[];
  readonly installed: InstalledCostObservation;
  readonly facadeDependencies: readonly FacadeDependencyReason[];
  readonly coldImports: readonly ColdImportGraph[];
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
    .map((entry) => ({
      package: entry.package,
      compressedBytes: safeBytes(entry.compressedBytes, `${entry.package} compressed tarball`, false),
      unpackedBytes: safeBytes(entry.unpackedBytes, `${entry.package} unpacked tarball`, false),
      fileCount: safeBytes(entry.fileCount, `${entry.package} tarball file count`, false),
    }))
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
  const externalVersions = input.installed.externalVersions
    .map((entry) => ({
      package: entry.package,
      versions: [...entry.versions].sort((a, b) => a.localeCompare(b)),
      instances: safeBytes(entry.instances, `${entry.package} external instances`, false),
    }))
    .sort((a, b) => a.package.localeCompare(b.package));
  const duplicateExternalVersions = input.installed.duplicateExternalVersions
    .map((entry) => ({ package: entry.package, versions: [...entry.versions].sort((a, b) => a.localeCompare(b)) }))
    .sort((a, b) => a.package.localeCompare(b.package));
  if (
    externalDependencies.some((name) => name.length === 0) ||
    new Set(externalDependencies).size !== externalDependencies.length ||
    input.installed.externalDependencyCount !== externalDependencies.length ||
    input.installed.packageInstanceCount !==
      input.installed.fleetPackageInstanceCount + input.installed.externalPackageInstanceCount ||
    input.installed.fleetPackageInstanceCount < input.installed.fleetPackageCount ||
    externalVersions.length !== externalDependencies.length ||
    externalVersions.some(
      (entry, index) =>
        entry.package !== externalDependencies[index] ||
        entry.versions.length === 0 ||
        new Set(entry.versions).size !== entry.versions.length,
    ) ||
    duplicateExternalVersions.some(
      (entry) =>
        entry.versions.length < 2 ||
        !externalVersions.some(
          (external) =>
            external.package === entry.package && JSON.stringify(external.versions) === JSON.stringify(entry.versions),
        ),
    ) ||
    duplicateExternalVersions.length !== externalVersions.filter((entry) => entry.versions.length > 1).length
  ) {
    fail('installed package census is internally inconsistent');
  }
  const totalBytes = tarballs.reduce((total, entry) => total + entry.compressedBytes, 0);
  const totalUnpackedBytes = tarballs.reduce((total, entry) => total + entry.unpackedBytes, 0);
  const totalFileCount = tarballs.reduce((total, entry) => total + entry.fileCount, 0);
  safeBytes(totalBytes, 'compressed tarball total', false);
  safeBytes(totalUnpackedBytes, 'unpacked tarball total', false);
  safeBytes(totalFileCount, 'tarball file total', false);

  const facadeDependencies = input.facadeDependencies
    .map((entry) => ({ package: entry.package, reason: entry.reason }))
    .sort((a, b) => a.package.localeCompare(b.package));
  if (
    facadeDependencies.length === 0 ||
    new Set(facadeDependencies.map((entry) => entry.package)).size !== facadeDependencies.length ||
    facadeDependencies.some(
      (entry) =>
        !expected.has(entry.package) ||
        entry.package === 'liteship' ||
        entry.reason.trim() !== entry.reason ||
        entry.reason.length < 24,
    )
  ) {
    fail('facade dependency reasons must be unique, fleet-owned, and substantive');
  }
  const coldImports = input.coldImports
    .map((entry) => {
      const modules = entry.modules
        .map((module) => ({ ...module }))
        .sort(
          (left, right) =>
            left.package.localeCompare(right.package) ||
            left.version.localeCompare(right.version) ||
            left.path.localeCompare(right.path),
        );
      const packages = [...entry.packages].sort((a, b) => a.localeCompare(b));
      return { ...entry, packages, modules };
    })
    .sort((a, b) => a.specifier.localeCompare(b.specifier));
  if (
    coldImports.length === 0 ||
    new Set(coldImports.map((entry) => entry.specifier)).size !== coldImports.length ||
    coldImports.some(
      (entry) =>
        entry.moduleCount !== entry.modules.length ||
        entry.packageCount !== entry.packages.length ||
        entry.moduleCount === 0 ||
        entry.packageCount === 0 ||
        new Set(entry.modules.map((module) => `${module.package}\0${module.version}\0${module.path}`)).size !==
          entry.modules.length ||
        new Set(entry.packages).size !== entry.packages.length ||
        JSON.stringify(entry.packages) !==
          JSON.stringify(
            [...new Set(entry.modules.map((module) => `${module.package}@${module.version}`))].sort((a, b) =>
              a.localeCompare(b),
            ),
          ),
    )
  ) {
    fail('cold-import graph census is internally inconsistent');
  }

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
      authority: 'addressed-baseline-gated',
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
        totalUnpackedBytes,
        totalFileCount,
        packages: tarballs,
      },
      installed: {
        ...input.installed,
        externalDependencies,
        externalVersions,
        duplicateExternalVersions,
      },
      facadeDependencies,
      coldImports,
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
  readonly facadeDependencies: readonly FacadeDependencyReason[];
  readonly coldImports: readonly ColdImportGraph[];
}): OneInstallCostReport {
  const tarballs = [...input.tarballs].map(([packageName, path]) => ({
    ...measurePackedTarball(path, packageName),
  }));
  const installed = measureInstalledTree(join(input.consumerDir, 'node_modules'), input.fleetPackages);
  return buildOneInstallCostReport({
    generatedAt: input.generatedAt,
    environment: input.environment,
    fleetPackages: input.fleetPackages,
    tarballs,
    installed,
    facadeDependencies: input.facadeDependencies,
    coldImports: input.coldImports,
  });
}

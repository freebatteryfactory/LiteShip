import { gzipSync } from 'node:zlib';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { spawnArgvCapture } from '../../../../scripts/lib/spawn.js';
import {
  buildOneInstallCostReport,
  buildColdImportGraph,
  COLD_IMPORT_PROBE_SOURCE,
  measureInstalledTree,
  measurePackedTarball,
  ONE_INSTALL_COST_SCHEMA_VERSION,
  type InstalledCostObservation,
  type InstalledTreeReader,
  type InstalledTreeStat,
} from '../../../../packages/cli/src/lib/one-install-cost-evidence.js';

const fleet = (): string[] => Array.from({ length: 25 }, (_, index) => `@liteship/package-${index}`);

const installed = (overrides: Partial<InstalledCostObservation> = {}): InstalledCostObservation => ({
  uniqueRegularFileBytes: 1_000,
  uniqueRegularFileCount: 50,
  directoryCount: 40,
  symlinkCount: 5,
  packageInstanceCount: 28,
  fleetPackageCount: 25,
  fleetPackageInstanceCount: 25,
  externalDependencyCount: 2,
  externalPackageInstanceCount: 3,
  externalDependencies: ['react', 'typescript'],
  externalVersions: [
    { package: 'react', versions: ['19.2.0'], instances: 1 },
    { package: 'typescript', versions: ['5.9.3'], instances: 2 },
  ],
  duplicateExternalVersions: [],
  ...overrides,
});

describe('one-install cost evidence', () => {
  it('records a deterministic schema and keeps observations outside fleet identity', () => {
    const names = fleet();
    const report = buildOneInstallCostReport({
      generatedAt: '2026-07-24T00:00:00.000Z',
      environment: {
        platform: 'linux',
        architecture: 'x64',
        nodeVersion: 'v22.0.0',
        packageManager: 'pnpm',
        packageManagerVersion: '10.14.0',
      },
      fleetPackages: names,
      tarballs: names.map((packageName, index) => ({
        package: packageName,
        compressedBytes: index + 1,
        unpackedBytes: index + 10,
        fileCount: index + 1,
      })),
      installed: installed(),
      facadeDependencies: [{ package: names[0]!, reason: 'Provides the first qualified facade capability.' }],
      coldImports: [
        {
          specifier: 'liteship',
          moduleCount: 1,
          packageCount: 1,
          packages: [`${names[0]}@0.19.0`],
          modules: [{ package: names[0]!, version: '0.19.0', path: 'dist/index.js' }],
        },
      ],
    });

    expect(report.schemaVersion).toBe(ONE_INSTALL_COST_SCHEMA_VERSION);
    expect(report.methodology.authority).toBe('addressed-baseline-gated');
    expect(report.semanticIdentity).toEqual({
      fleetPackageCount: 25,
      fleetPackages: [...names].sort(),
    });
    expect(report.observation.compressedTarballs).toMatchObject({
      packageCount: 25,
      totalBytes: 325,
      totalUnpackedBytes: 550,
      totalFileCount: 325,
    });
    expect(report.observation.environment).toMatchObject({ platform: 'linux', packageManager: 'pnpm' });
    expect(JSON.stringify(report.semanticIdentity)).not.toContain('linux');
    expect(JSON.stringify(report.semanticIdentity)).not.toContain('bytes');
  });

  it('deduplicates physical files/directories and never follows a symlink cycle', () => {
    const root = resolve('virtual-node-modules');
    interface Node {
      readonly stat: InstalledTreeStat;
      readonly children?: readonly string[];
      readonly text?: string;
    }
    const nodes = new Map<string, Node>();
    const directory = (path: string, inode: number | string, children: readonly string[]): void => {
      nodes.set(path, { stat: { kind: 'directory', bytes: 0, device: '1', inode: String(inode) }, children });
    };
    const file = (path: string, inode: number | string, bytes: number, text = ''): void => {
      nodes.set(path, { stat: { kind: 'file', bytes, device: '1', inode: String(inode) }, text });
    };
    const names = fleet();
    const rootChildren: string[] = ['cycle', 'physical-a', 'physical-b', 'wide-a.bin', 'wide-b.bin'];
    directory(root, 1, rootChildren);
    nodes.set(resolve(root, 'cycle'), {
      stat: { kind: 'symlink', bytes: 7, device: '1', inode: '2' },
      children: ['must-not-be-read'],
    });
    directory(resolve(root, 'physical-a'), 3, ['shared.bin']);
    directory(resolve(root, 'physical-b'), 3, ['shared.bin']);
    file(resolve(root, 'physical-a', 'shared.bin'), 4, 100);
    file(resolve(root, 'physical-b', 'shared.bin'), 4, 100);
    file(resolve(root, 'wide-a.bin'), '11258999069865268', 1);
    file(resolve(root, 'wide-b.bin'), '11258999069865269', 2);

    names.forEach((name, index) => {
      const dirName = `fleet-${index}`;
      rootChildren.push(dirName);
      directory(resolve(root, dirName), 10 + index, ['package.json']);
      file(resolve(root, dirName, 'package.json'), 100 + index, 10, JSON.stringify({ name, version: '0.19.0' }));
    });
    rootChildren.push('external');
    directory(resolve(root, 'external'), 50, ['package.json']);
    file(resolve(root, 'external', 'package.json'), 200, 20, JSON.stringify({ name: 'react', version: '19.2.0' }));

    const reader: InstalledTreeReader = {
      entries: (path) => {
        const node = nodes.get(path);
        if (node?.stat.kind === 'symlink') throw new Error('walker followed a symlink');
        return node?.children ?? [];
      },
      stat: (path) => nodes.get(path)!.stat,
      readText: (path) => nodes.get(path)!.text ?? '',
    };

    const observation = measureInstalledTree(root, names, reader);
    expect(observation).toMatchObject({
      uniqueRegularFileBytes: 373,
      uniqueRegularFileCount: 29,
      symlinkCount: 1,
      fleetPackageCount: 25,
      fleetPackageInstanceCount: 25,
      externalDependencyCount: 1,
      externalPackageInstanceCount: 1,
      externalDependencies: ['react'],
    });
    expect(observation.directoryCount).toBe(28);
  });

  it('refuses an installed census that omits even one fleet package', () => {
    const root = resolve('missing-package-node-modules');
    const names = fleet();
    const reader: InstalledTreeReader = {
      entries: (path) => (path === root ? ['package.json'] : []),
      stat: (path) =>
        path === root
          ? { kind: 'directory', bytes: 0, device: '1', inode: '1' }
          : { kind: 'file', bytes: 10, device: '1', inode: '2' },
      readText: () => JSON.stringify({ name: names[0], version: '0.19.0' }),
    };
    expect(() => measureInstalledTree(root, names, reader)).toThrow(/missing fleet package/u);
  });

  it('measures npm tar payload bytes independently of the compressed envelope', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-cost-tar-'));
    try {
      const content = Buffer.from('hello');
      const header = Buffer.alloc(512);
      header.write('package/dist/index.js', 0, 'ascii');
      header.write('0000644\0', 100, 'ascii');
      header.write('0000000\0', 108, 'ascii');
      header.write('0000000\0', 116, 'ascii');
      header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 'ascii');
      header.write('00000000000\0', 136, 'ascii');
      header.fill(0x20, 148, 156);
      header.write('0', 156, 'ascii');
      header.write('ustar\0', 257, 'ascii');
      header.write('00', 263, 'ascii');
      const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
      header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 'ascii');
      const archive = Buffer.concat([header, content, Buffer.alloc(512 - content.length), Buffer.alloc(1024)]);
      const path = join(root, 'package.tgz');
      writeFileSync(path, gzipSync(archive));
      expect(measurePackedTarball(path, '@liteship/example')).toMatchObject({
        package: '@liteship/example',
        unpackedBytes: 5,
        fileCount: 1,
      });
      header[0] = (header[0] ?? 0) ^ 1;
      writeFileSync(
        path,
        gzipSync(Buffer.concat([header, content, Buffer.alloc(512 - content.length), Buffer.alloc(1024)])),
      );
      expect(() => measurePackedTarball(path, '@liteship/example')).toThrow(/checksum/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('normalizes inspector paths to package-relative cold-import modules', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-cost-import-'));
    try {
      const packageRoot = join(root, 'node_modules', '@liteship', 'core');
      mkdirSync(join(packageRoot, 'dist'), { recursive: true });
      writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: '@liteship/core', version: '0.19.0' }));
      writeFileSync(join(packageRoot, 'dist', 'index.js'), 'export {};');
      const graph = buildColdImportGraph({
        specifier: 'liteship',
        nodeModulesRoot: join(root, 'node_modules'),
        scriptPaths: [
          join(packageRoot, 'dist', 'index.js'),
          join(packageRoot, 'dist', 'index.js'),
          join(root, 'probe.mjs'),
        ],
      });
      expect(graph).toEqual({
        specifier: 'liteship',
        moduleCount: 1,
        packageCount: 1,
        packages: ['@liteship/core@0.19.0'],
        modules: [{ package: '@liteship/core', version: '0.19.0', path: 'dist/index.js' }],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses a named installed package without a version', () => {
    const root = resolve('versionless-node-modules');
    const packageRoot = resolve(root, 'versionless');
    const reader: InstalledTreeReader = {
      entries: (path) => (path === root ? ['versionless'] : path === packageRoot ? ['package.json'] : []),
      stat: (path) =>
        path === root
          ? { kind: 'directory', bytes: 0, device: '1', inode: '1' }
          : path === packageRoot
            ? { kind: 'directory', bytes: 0, device: '1', inode: '2' }
            : { kind: 'file', bytes: 10, device: '1', inode: '3' },
      readText: () => JSON.stringify({ name: '@liteship/package-0' }),
    };
    expect(() => measureInstalledTree(root, fleet(), reader)).toThrow(/no version/u);
  });

  it('does not classify embedded package manifests as installed package instances', () => {
    const root = resolve('embedded-manifest-node-modules');
    const names = fleet();
    const nodes = new Map<string, { stat: InstalledTreeStat; children?: readonly string[]; text?: string }>();
    nodes.set(root, { stat: { kind: 'directory', bytes: 0, device: '1', inode: '1' }, children: [] });
    const rootChildren = nodes.get(root)!.children as string[];
    names.forEach((name, index) => {
      const directoryName = `fleet-${index}`;
      const packageRoot = resolve(root, directoryName);
      const assetRoot = resolve(packageRoot, 'templates', 'example');
      rootChildren.push(directoryName);
      nodes.set(packageRoot, {
        stat: { kind: 'directory', bytes: 0, device: '1', inode: String(10 + index) },
        children: ['package.json', ...(index === 0 ? ['templates'] : [])],
      });
      nodes.set(resolve(packageRoot, 'package.json'), {
        stat: { kind: 'file', bytes: 10, device: '1', inode: String(100 + index) },
        text: JSON.stringify({ name, version: '0.19.0' }),
      });
      if (index === 0) {
        nodes.set(resolve(packageRoot, 'templates'), {
          stat: { kind: 'directory', bytes: 0, device: '1', inode: '500' },
          children: ['example'],
        });
        nodes.set(assetRoot, {
          stat: { kind: 'directory', bytes: 0, device: '1', inode: '501' },
          children: ['package.json'],
        });
        nodes.set(resolve(assetRoot, 'package.json'), {
          stat: { kind: 'file', bytes: 10, device: '1', inode: '502' },
          text: JSON.stringify({ name: 'example-without-version' }),
        });
      }
    });
    const reader: InstalledTreeReader = {
      entries: (path) => nodes.get(path)?.children ?? [],
      stat: (path) => nodes.get(path)!.stat,
      readText: (path) => nodes.get(path)!.text ?? '',
    };
    expect(measureInstalledTree(root, names, reader).packageInstanceCount).toBe(25);
  });

  it('observes the real cold ESM graph through the stable inspector probe', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-cost-probe-'));
    try {
      const packageRoot = join(root, 'node_modules', 'liteship');
      mkdirSync(join(packageRoot, 'dist'), { recursive: true });
      writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: 'liteship', version: '0.19.0', type: 'module', exports: './dist/index.js' }),
      );
      writeFileSync(join(packageRoot, 'dist', 'dependency.js'), 'export const value = 1;');
      writeFileSync(join(packageRoot, 'dist', 'index.js'), "export { value } from './dependency.js';");
      const probe = join(root, 'probe.mjs');
      writeFileSync(probe, COLD_IMPORT_PROBE_SOURCE);
      const probeResult = await spawnArgvCapture(process.execPath, [probe, 'liteship'], { cwd: root });
      expect(probeResult).toMatchObject({ exitCode: 0, stderr: '' });
      const paths = JSON.parse(probeResult.stdout) as unknown;
      expect(Array.isArray(paths)).toBe(true);
      const graph = buildColdImportGraph({
        specifier: 'liteship',
        nodeModulesRoot: join(root, 'node_modules'),
        scriptPaths: paths as string[],
      });
      expect(graph.modules.map((entry) => entry.path)).toEqual(['dist/dependency.js', 'dist/index.js']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

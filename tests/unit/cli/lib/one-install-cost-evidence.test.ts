import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildOneInstallCostReport,
  measureInstalledTree,
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
      },
      fleetPackages: names,
      tarballs: names.map((packageName, index) => ({ package: packageName, bytes: index + 1 })),
      installed: installed(),
    });

    expect(report.schemaVersion).toBe(ONE_INSTALL_COST_SCHEMA_VERSION);
    expect(report.methodology.authority).toBe('observational-no-threshold');
    expect(report.semanticIdentity).toEqual({
      fleetPackageCount: 25,
      fleetPackages: [...names].sort(),
    });
    expect(report.observation.compressedTarballs).toMatchObject({ packageCount: 25, totalBytes: 325 });
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
    const directory = (path: string, inode: number, children: readonly string[]): void => {
      nodes.set(path, { stat: { kind: 'directory', bytes: 0, device: 1, inode }, children });
    };
    const file = (path: string, inode: number, bytes: number, text = ''): void => {
      nodes.set(path, { stat: { kind: 'file', bytes, device: 1, inode }, text });
    };
    const names = fleet();
    const rootChildren: string[] = ['cycle', 'physical-a', 'physical-b'];
    directory(root, 1, rootChildren);
    nodes.set(resolve(root, 'cycle'), {
      stat: { kind: 'symlink', bytes: 7, device: 1, inode: 2 },
      children: ['must-not-be-read'],
    });
    directory(resolve(root, 'physical-a'), 3, ['shared.bin']);
    directory(resolve(root, 'physical-b'), 3, ['shared.bin']);
    file(resolve(root, 'physical-a', 'shared.bin'), 4, 100);
    file(resolve(root, 'physical-b', 'shared.bin'), 4, 100);

    names.forEach((name, index) => {
      const dirName = `fleet-${index}`;
      rootChildren.push(dirName);
      directory(resolve(root, dirName), 10 + index, ['package.json']);
      file(resolve(root, dirName, 'package.json'), 100 + index, 10, JSON.stringify({ name }));
    });
    rootChildren.push('external');
    directory(resolve(root, 'external'), 50, ['package.json']);
    file(resolve(root, 'external', 'package.json'), 200, 20, JSON.stringify({ name: 'react' }));

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
      uniqueRegularFileBytes: 370,
      uniqueRegularFileCount: 27,
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
          ? { kind: 'directory', bytes: 0, device: 1, inode: 1 }
          : { kind: 'file', bytes: 10, device: 1, inode: 2 },
      readText: () => JSON.stringify({ name: names[0] }),
    };
    expect(() => measureInstalledTree(root, names, reader)).toThrow(/missing fleet package/u);
  });
});

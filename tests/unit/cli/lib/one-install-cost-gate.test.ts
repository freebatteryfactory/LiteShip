import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildOneInstallCostBaseline,
  ONE_INSTALL_COST_BASELINE_PATH,
  ONE_INSTALL_COST_UPDATE_ENV,
  oneInstallCostFindings,
  parseOneInstallCostBaseline,
} from '../../../../packages/cli/src/lib/one-install-cost-gate.js';
import {
  buildOneInstallCostReport,
  type InstalledCostObservation,
  type OneInstallCostReport,
} from '../../../../packages/cli/src/lib/one-install-cost-evidence.js';

const names = Array.from({ length: 25 }, (_, index) => `@liteship/package-${index}`);
const installed: InstalledCostObservation = {
  uniqueRegularFileBytes: 100_000,
  uniqueRegularFileCount: 500,
  directoryCount: 200,
  symlinkCount: 40,
  packageInstanceCount: 27,
  fleetPackageCount: 25,
  fleetPackageInstanceCount: 25,
  externalDependencyCount: 2,
  externalPackageInstanceCount: 2,
  externalDependencies: ['cborg', 'react'],
  externalVersions: [
    { package: 'cborg', versions: ['4.3.0'], instances: 1 },
    { package: 'react', versions: ['19.2.0'], instances: 1 },
  ],
  duplicateExternalVersions: [],
};

function report(): OneInstallCostReport {
  return buildOneInstallCostReport({
    generatedAt: '2026-07-24T00:00:00.000Z',
    environment: {
      platform: 'linux',
      architecture: 'x64',
      nodeVersion: 'v22.23.1',
      packageManager: 'pnpm',
      packageManagerVersion: '10.14.0',
    },
    fleetPackages: names,
    tarballs: names.map((packageName, index) => ({
      package: packageName,
      compressedBytes: 10_000 + index,
      unpackedBytes: 20_000 + index,
      fileCount: 10 + index,
    })),
    installed,
    facadeDependencies: [
      { package: names[0]!, reason: 'Provides the first qualified facade capability.' },
      { package: names[1]!, reason: 'Provides the second qualified facade capability.' },
    ],
    coldImports: [
      {
        specifier: 'liteship',
        moduleCount: 2,
        packageCount: 2,
        packages: [`${names[0]}@0.19.0`, `${names[1]}@0.19.0`],
        modules: [
          { package: names[0]!, version: '0.19.0', path: 'dist/index.js' },
          { package: names[1]!, version: '0.19.0', path: 'dist/index.js' },
        ],
      },
    ],
  });
}

function withReport(
  source: OneInstallCostReport,
  observation: Partial<OneInstallCostReport['observation']>,
): OneInstallCostReport {
  return { ...source, observation: { ...source.observation, ...observation } };
}

describe('one-install cost baseline gate', () => {
  it('ships a valid addressed fleet baseline and keeps update authority out of CI and release', () => {
    const baseline = parseOneInstallCostBaseline(
      JSON.parse(readFileSync(resolve(ONE_INSTALL_COST_BASELINE_PATH), 'utf8')) as unknown,
    );
    expect(baseline.fleetPackageCount).toBe(25);
    const authority = [
      readFileSync(resolve('.github/workflows/ci.yml'), 'utf8'),
      readFileSync(resolve('.github/workflows/release.yml'), 'utf8'),
    ].join('\n');
    expect(authority).not.toContain(ONE_INSTALL_COST_UPDATE_ENV);
  });

  it('addresses and strictly re-parses the exact approved observation', () => {
    const baseline = buildOneInstallCostBaseline(report());
    expect(parseOneInstallCostBaseline(JSON.parse(JSON.stringify(baseline)) as unknown)).toEqual(baseline);
    expect(oneInstallCostFindings(report(), baseline)).toEqual([]);
    expect(() => parseOneInstallCostBaseline({ ...baseline, baselineId: `sha256:${'0'.repeat(64)}` })).toThrow(
      /identity/u,
    );
  });

  it('permits the stated byte floor and rejects the next byte without lowering the baseline', () => {
    const source = report();
    const baseline = buildOneInstallCostBaseline(source);
    const packed = source.observation.compressedTarballs;
    const atLimit = withReport(source, {
      compressedTarballs: { ...packed, totalBytes: packed.totalBytes + 1024 * 1024 },
    });
    expect(oneInstallCostFindings(atLimit, baseline)).toEqual([]);
    const over = withReport(source, {
      compressedTarballs: { ...packed, totalBytes: packed.totalBytes + 1024 * 1024 + 1 },
    });
    expect(oneInstallCostFindings(over, baseline)).toEqual([
      expect.objectContaining({ code: 'fleet-total-regression', subject: 'compressedBytes' }),
    ]);
  });

  it('rejects unapproved package growth, dependencies, cold modules, and duplicate versions', () => {
    const source = report();
    const baseline = buildOneInstallCostBaseline(source);
    const packed = source.observation.compressedTarballs;
    const packages = packed.packages.map((entry, index) =>
      index === 0 ? { ...entry, unpackedBytes: entry.unpackedBytes + 1024 * 1024 + 1 } : entry,
    );
    const cold = source.observation.coldImports[0]!;
    const foreignModule = { package: names[2]!, version: '0.19.0', path: 'dist/foreign.js' };
    const observed = withReport(source, {
      compressedTarballs: { ...packed, packages },
      facadeDependencies: [
        ...source.observation.facadeDependencies,
        { package: names[2]!, reason: 'Provides a newly added but unapproved facade capability.' },
      ],
      coldImports: [
        {
          ...cold,
          moduleCount: cold.moduleCount + 1,
          packageCount: cold.packageCount + 1,
          packages: [...cold.packages, `${names[2]}@0.19.0`],
          modules: [...cold.modules, foreignModule],
        },
      ],
      installed: {
        ...source.observation.installed,
        duplicateExternalVersions: [{ package: 'react', versions: ['18.3.1', '19.2.0'] }],
      },
    });
    expect(oneInstallCostFindings(observed, baseline).map((finding) => finding.code)).toEqual([
      'package-regression',
      'facade-dependency-drift',
      'cold-import-drift',
      'duplicate-version-drift',
    ]);
  });

  it('accepts supported cross-platform observations and refuses unsupported toolchains', () => {
    const source = report();
    const baseline = buildOneInstallCostBaseline(source);
    const supportedWindows = withReport(source, {
      environment: { ...source.observation.environment, platform: 'win32' },
    });
    expect(oneInstallCostFindings(supportedWindows, baseline)).toEqual([]);
    const supportedPnpm11 = withReport(source, {
      environment: { ...source.observation.environment, packageManagerVersion: '11.16.0' },
    });
    expect(oneInstallCostFindings(supportedPnpm11, baseline)).toEqual([]);
    const foreign = withReport(source, {
      environment: { ...source.observation.environment, nodeVersion: 'v21.9.0' },
    });
    expect(oneInstallCostFindings(foreign, baseline)).toEqual([
      expect.objectContaining({ code: 'foreign-environment' }),
    ]);
  });

  it('rejects a missing approved facade import graph', () => {
    const source = report();
    const baseline = buildOneInstallCostBaseline(source);
    const missing = withReport(source, { coldImports: [] });
    expect(oneInstallCostFindings(missing, baseline)).toEqual([
      expect.objectContaining({ code: 'cold-import-drift', subject: 'liteship' }),
    ]);
  });
});

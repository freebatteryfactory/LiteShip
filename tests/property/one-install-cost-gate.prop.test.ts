import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildOneInstallCostBaseline,
  oneInstallCostFindings,
} from '../../packages/cli/src/lib/one-install-cost-gate.js';
import {
  buildOneInstallCostReport,
  type InstalledCostObservation,
} from '../../packages/cli/src/lib/one-install-cost-evidence.js';

const names = Array.from({ length: 25 }, (_, index) => `@liteship/package-${index}`);
const installed: InstalledCostObservation = {
  uniqueRegularFileBytes: 1,
  uniqueRegularFileCount: 1,
  directoryCount: 1,
  symlinkCount: 0,
  packageInstanceCount: 25,
  fleetPackageCount: 25,
  fleetPackageInstanceCount: 25,
  externalDependencyCount: 0,
  externalPackageInstanceCount: 0,
  externalDependencies: [],
  externalVersions: [],
  duplicateExternalVersions: [],
};

function observation(order = names) {
  return buildOneInstallCostReport({
    generatedAt: '2026-07-24T00:00:00.000Z',
    environment: {
      platform: 'linux',
      architecture: 'x64',
      nodeVersion: 'v22.23.1',
      packageManager: 'pnpm',
      packageManagerVersion: '10.14.0',
    },
    fleetPackages: order,
    tarballs: order.map((packageName, index) => ({
      package: packageName,
      compressedBytes: 1000 + names.indexOf(packageName),
      unpackedBytes: 2000 + names.indexOf(packageName),
      fileCount: 10 + names.indexOf(packageName),
    })),
    installed,
    facadeDependencies: names.slice(0, 2).map((packageName) => ({
      package: packageName,
      reason: `Provides a qualified facade capability for ${packageName}.`,
    })),
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
}

describe('one-install cost gate properties', () => {
  it('baseline identity is invariant under source census permutations', () => {
    const expected = buildOneInstallCostBaseline(observation()).baselineId;
    fc.assert(
      fc.property(fc.shuffledSubarray(names, { minLength: names.length, maxLength: names.length }), (order) => {
        expect(buildOneInstallCostBaseline(observation(order)).baselineId).toBe(expected);
      }),
      { numRuns: 75 },
    );
  });

  it('every package byte increase beyond the absolute floor is detected', () => {
    const report = observation();
    const baseline = buildOneInstallCostBaseline(report);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 24 }), fc.integer({ min: 1, max: 1_000_000 }), (index, extra) => {
        const packed = report.observation.compressedTarballs;
        const packages = packed.packages.map((entry, candidate) =>
          candidate === index ? { ...entry, unpackedBytes: entry.unpackedBytes + 1024 * 1024 + extra } : entry,
        );
        const mutated = {
          ...report,
          observation: {
            ...report.observation,
            compressedTarballs: { ...packed, packages },
          },
        };
        expect(oneInstallCostFindings(mutated, baseline)).toContainEqual(
          expect.objectContaining({ code: 'package-regression', subject: packages[index]!.package }),
        );
      }),
      { numRuns: 75 },
    );
  });
});

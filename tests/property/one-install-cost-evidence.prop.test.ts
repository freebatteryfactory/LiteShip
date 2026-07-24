import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildOneInstallCostReport,
  type CostEvidenceEnvironment,
  type InstalledCostObservation,
} from '../../packages/cli/src/lib/one-install-cost-evidence.js';

const NAMES = Array.from({ length: 25 }, (_, index) => `@liteship/package-${index}`);
const ENVIRONMENT: CostEvidenceEnvironment = {
  platform: 'fixture-os',
  architecture: 'fixture-arch',
  nodeVersion: 'fixture-node',
  packageManager: 'pnpm',
  packageManagerVersion: '10.14.0',
};
const INSTALLED: InstalledCostObservation = {
  uniqueRegularFileBytes: 10_000,
  uniqueRegularFileCount: 100,
  directoryCount: 80,
  symlinkCount: 20,
  packageInstanceCount: 30,
  fleetPackageCount: 25,
  fleetPackageInstanceCount: 25,
  externalDependencyCount: 3,
  externalPackageInstanceCount: 5,
  externalDependencies: ['typescript', 'astro', 'react'],
  externalVersions: [
    { package: 'astro', versions: ['7.1.0'], instances: 1 },
    { package: 'react', versions: ['19.2.0'], instances: 2 },
    { package: 'typescript', versions: ['5.9.3'], instances: 2 },
  ],
  duplicateExternalVersions: [],
};

function tarballs() {
  return NAMES.map((packageName, index) => ({
    package: packageName,
    compressedBytes: 1_000 + index,
    unpackedBytes: 2_000 + index,
    fileCount: 10 + index,
  }));
}

function build(
  overrides: {
    fleetPackages?: readonly string[];
    tarballs?: ReturnType<typeof tarballs>;
    installed?: InstalledCostObservation;
  } = {},
) {
  return buildOneInstallCostReport({
    generatedAt: '2026-07-24T00:00:00.000Z',
    environment: ENVIRONMENT,
    fleetPackages: overrides.fleetPackages ?? NAMES,
    tarballs: overrides.tarballs ?? tarballs(),
    installed: overrides.installed ?? INSTALLED,
    facadeDependencies: [{ package: NAMES[0]!, reason: 'Provides the first qualified facade capability.' }],
    coldImports: [
      {
        specifier: 'liteship',
        moduleCount: 1,
        packageCount: 1,
        packages: [`${NAMES[0]}@0.19.0`],
        modules: [{ package: NAMES[0]!, version: '0.19.0', path: 'dist/index.js' }],
      },
    ],
  });
}

describe('one-install cost evidence properties', () => {
  it('is byte-for-byte deterministic under fleet, tarball, and external-name permutations', () => {
    const expected = JSON.stringify(build());
    fc.assert(
      fc.property(
        fc.shuffledSubarray(NAMES, { minLength: NAMES.length, maxLength: NAMES.length }),
        fc.shuffledSubarray(tarballs(), { minLength: NAMES.length, maxLength: NAMES.length }),
        fc.shuffledSubarray(INSTALLED.externalDependencies, {
          minLength: INSTALLED.externalDependencies.length,
          maxLength: INSTALLED.externalDependencies.length,
        }),
        (fleetPackages, packed, externalDependencies) => {
          expect(
            JSON.stringify(
              build({
                fleetPackages,
                tarballs: packed,
                installed: { ...INSTALLED, externalDependencies },
              }),
            ),
          ).toBe(expected);
        },
      ),
      { seed: 0xc057, numRuns: 100 },
    );
  });

  it('refuses every omitted or foreign tarball instead of reporting a partial fleet', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: NAMES.length - 1 }), (index) => {
        const omitted = tarballs().filter((_, entryIndex) => entryIndex !== index);
        expect(() => build({ tarballs: omitted })).toThrow(/exact 25-package fleet/u);
        const foreign = tarballs().map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, package: '@foreign/rogue' } : entry,
        );
        expect(() => build({ tarballs: foreign })).toThrow(/exact 25-package fleet/u);
      }),
      { seed: 0x0b17, numRuns: 75 },
    );
  });

  it('refuses duplicate tarballs even when the raw entry count remains 25', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: NAMES.length - 1 }),
        fc.integer({ min: 1, max: NAMES.length - 1 }),
        (index, distance) => {
          const duplicateOf = (index + distance) % NAMES.length;
          const duplicate = tarballs().map((entry, entryIndex) =>
            entryIndex === index ? { ...entry, package: NAMES[duplicateOf]! } : entry,
          );
          expect(() => build({ tarballs: duplicate })).toThrow(/exact 25-package fleet/u);
        },
      ),
      { seed: 0xd0b1e, numRuns: 75 },
    );
  });

  it('refuses stale authored or observed fleet counts in either direction', () => {
    expect(() => build({ fleetPackages: NAMES.slice(0, 24) })).toThrow(/exactly 25 unique/u);
    expect(() => build({ fleetPackages: [...NAMES, '@liteship/package-25'] })).toThrow(/exactly 25 unique/u);
    expect(() => build({ fleetPackages: [...NAMES.slice(0, 24), NAMES[0]!] })).toThrow(/exactly 25 unique/u);
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }).filter((count) => count !== 25),
        (fleetPackageCount) => {
          expect(() => build({ installed: { ...INSTALLED, fleetPackageCount } })).toThrow(/installed fleet count/u);
        },
      ),
      { seed: 0x57a1e, numRuns: 75 },
    );
  });

  it('refuses zero, negative, fractional, non-finite, and unsafe compressed-byte claims', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: NAMES.length - 1 }),
        fc.constantFrom(0, -1, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1),
        (index, bytes) => {
          const bogus = tarballs().map((entry, entryIndex) =>
            entryIndex === index ? { ...entry, compressedBytes: bytes } : entry,
          );
          expect(() => build({ tarballs: bogus })).toThrow(/positive safe integer byte count/u);
        },
      ),
      { seed: 0xb09a5, numRuns: 100 },
    );
  });

  it('refuses bogus installed bytes, counts, and internally inconsistent package census data', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'uniqueRegularFileBytes',
          'uniqueRegularFileCount',
          'directoryCount',
          'symlinkCount',
          'packageInstanceCount',
          'fleetPackageInstanceCount',
          'externalDependencyCount',
          'externalPackageInstanceCount',
        ),
        fc.constantFrom(-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1),
        (field, value) => {
          expect(() => build({ installed: { ...INSTALLED, [field]: value } })).toThrow(
            /non-negative safe integer|internally inconsistent/u,
          );
        },
      ),
      { seed: 0x1a57a11, numRuns: 100 },
    );
    expect(() => build({ installed: { ...INSTALLED, externalDependencyCount: 2 } })).toThrow(
      /internally inconsistent/u,
    );
    expect(() => build({ installed: { ...INSTALLED, externalDependencies: ['react', 'react', 'astro'] } })).toThrow(
      /internally inconsistent/u,
    );
  });

  it('refuses a total compressed size that overflows safe integer accounting', () => {
    const huge = tarballs().map((entry) => ({ ...entry, compressedBytes: Number.MAX_SAFE_INTEGER }));
    expect(() => build({ tarballs: huge })).toThrow(/compressed tarball total/u);
  });
});

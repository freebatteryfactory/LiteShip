/** Property laws for deterministic dual-toolchain evidence normalization. @module */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  TYPESCRIPT_TOOLCHAIN_CONTRACT,
  qualificationDigest,
  qualifyTypeScriptToolchains,
  type TypeScriptQualificationRun,
  type TypeScriptToolchainObservation,
} from '../../scripts/lib/typescript-toolchain-qualification.js';

const fixtureDigest = qualificationDigest('property-fixture');
const declarationA = qualificationDigest('A');
const declarationB = qualificationDigest('B');
const hexUnit = fc.constantFrom(...'0123456789abcdef'.split(''));
const digestHex = fc.string({ unit: hexUnit, minLength: 64, maxLength: 64 });

function run(order: boolean): TypeScriptQualificationRun {
  const diagnostics = [
    { code: 2322, file: 'src/index.ts', line: 4, column: 7 },
    { code: 2322, file: 'src/other.ts', line: 2, column: 3 },
  ];
  const graph = [
    { path: 'index.d.ts', digest: declarationA, dependencies: ['./other.js', './value.js'] },
    { path: 'other.d.ts', digest: declarationB, dependencies: [] },
  ];
  const surfaces = [
    { specifier: 'fixture', declaration: 'index.d.ts', digest: declarationA },
    { specifier: 'fixture/other', declaration: 'other.d.ts', digest: declarationB },
  ];
  return {
    exitCode: 1,
    diagnostics: order ? diagnostics : [...diagnostics].reverse(),
    declarationGraph: order ? graph : [...graph].reverse(),
    emittedPackageSurfaces: order ? surfaces : [...surfaces].reverse(),
    metrics: { wallMs: 1, peakRssBytes: 1 },
  };
}

function observation(role: 'compatibility' | 'native', order: boolean): TypeScriptToolchainObservation {
  const contract = TYPESCRIPT_TOOLCHAIN_CONTRACT[role];
  return {
    role,
    dependency: contract.dependency,
    packageName: contract.packageName,
    version: contract.version,
    implementationVersion: contract.implementationVersion,
    bin: contract.bin,
    fixtureDigest,
    requestedWorkers: role === 'native' ? 2 : 1,
    cold: run(order),
    warm: run(order),
  };
}

function report(compatibilityOrder: boolean, nativeOrder: boolean) {
  return qualifyTypeScriptToolchains({
    fixtureDigest,
    nativeWorkerCeiling: 2,
    compatibility: observation('compatibility', compatibilityOrder),
    native: observation('native', nativeOrder),
  });
}

describe('TypeScript qualification properties', () => {
  it('is invariant to compiler enumeration order', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (compatibilityOrder, nativeOrder) => {
        const candidate = report(compatibilityOrder, nativeOrder);
        const canonical = report(true, true);
        expect(candidate.ok).toBe(true);
        expect(candidate.reportId).toBe(canonical.reportId);
      }),
    );
  });

  it('always reds when one emitted package digest changes', () => {
    fc.assert(
      fc.property(digestHex, (hex) => {
        fc.pre(hex !== declarationA.slice('sha256:'.length));
        const native = observation('native', true);
        const altered: TypeScriptToolchainObservation = {
          ...native,
          cold: {
            ...native.cold,
            emittedPackageSurfaces: [
              { ...native.cold.emittedPackageSurfaces[0]!, digest: `sha256:${hex}` },
              native.cold.emittedPackageSurfaces[1]!,
            ],
          },
          warm: {
            ...native.warm,
            emittedPackageSurfaces: [
              { ...native.warm.emittedPackageSurfaces[0]!, digest: `sha256:${hex}` },
              native.warm.emittedPackageSurfaces[1]!,
            ],
          },
        };
        const result = qualifyTypeScriptToolchains({
          fixtureDigest,
          nativeWorkerCeiling: 2,
          compatibility: observation('compatibility', true),
          native: altered,
        });
        expect(result.ok).toBe(false);
        expect(result.findings).toContainEqual(expect.objectContaining({ code: 'emitted-surface-mismatch' }));
      }),
    );
  });
});

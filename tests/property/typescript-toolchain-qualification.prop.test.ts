/** Semantic TypeScript qualification laws across process exit conventions. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  TYPESCRIPT_TOOLCHAIN_CONTRACT,
  qualificationDigest,
  qualifyTypeScriptToolchains,
  type TypeScriptQualificationRun,
  type TypeScriptToolchainObservation,
} from '../../scripts/lib/typescript-toolchain-qualification.js';

const digest = qualificationDigest('fixture');
const declarationDigest = qualificationDigest('export interface Value {}\n');

function run(exitCode: number, signal: NodeJS.Signals | null = null): TypeScriptQualificationRun {
  return {
    exitCode,
    signal,
    stderrTail: 'src/index.ts(1,1): error TS2322: expected',
    diagnostics: [{ code: 2322, file: 'src/index.ts', line: 1, column: 1 }],
    declarationGraph: [{ path: 'index.d.ts', digest: declarationDigest, dependencies: [] }],
    emittedPackageSurfaces: [
      { specifier: 'typescript-dual-toolchain-fixture', declaration: 'index.d.ts', digest: declarationDigest },
    ],
    metrics: { wallMs: 1, peakRssBytes: 1 },
  };
}

function observation(role: 'compatibility' | 'native', sample: TypeScriptQualificationRun): TypeScriptToolchainObservation {
  const contract = TYPESCRIPT_TOOLCHAIN_CONTRACT[role];
  return {
    role,
    ...contract,
    fixtureDigest: digest,
    requestedWorkers: role === 'native' ? 2 : 1,
    cold: sample,
    warm: sample,
  };
}

function qualify(sample: TypeScriptQualificationRun) {
  return qualifyTypeScriptToolchains({
    fixtureDigest: digest,
    nativeWorkerCeiling: 2,
    compatibility: observation('compatibility', sample),
    native: observation('native', sample),
  });
}

describe('TypeScript qualification process semantics', () => {
  it('admits every ordinary nonzero diagnostic exit when the semantic outputs are complete', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 255 }), (exitCode) => {
        expect(qualify(run(exitCode)).ok).toBe(true);
      }),
      { seed: 0x7500_0001, numRuns: 255 },
    );
  });

  it('rejects clean exits and signal termination regardless of otherwise valid output', () => {
    expect(qualify(run(0)).findings.map((finding) => finding.code)).toContain('unexpected-exit');
    fc.assert(
      fc.property(fc.constantFrom<NodeJS.Signals>('SIGABRT', 'SIGKILL', 'SIGSEGV', 'SIGTERM'), (signal) => {
        expect(qualify(run(1, signal)).findings.map((finding) => finding.code)).toContain('unexpected-exit');
      }),
      { seed: 0x7500_0002, numRuns: 40 },
    );
  });
});

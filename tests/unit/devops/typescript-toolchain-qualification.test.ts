/** Pure hostile controls for the TypeScript 6/7 qualification authority. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PEER_INSTALLS } from '../../../packages/command/src/commands/package-smoke-registry.js';
import {
  TYPESCRIPT_TOOLCHAIN_CONTRACT,
  qualificationDigest,
  qualifyTypeScriptToolchains,
  resolveNativeTypeScriptWorkers,
  type TypeScriptQualificationRun,
  type TypeScriptToolchainObservation,
} from '../../../scripts/lib/typescript-toolchain-qualification.js';

const FIXTURE_DIGEST = qualificationDigest('fixture');
const DECLARATION_DIGEST = qualificationDigest('export interface Value {}\n');

function run(overrides: Partial<TypeScriptQualificationRun> = {}): TypeScriptQualificationRun {
  return {
    exitCode: 1,
    signal: null,
    stderrTail: 'src/index.ts(12,14): error TS2322: planted diagnostic',
    diagnostics: [{ code: 2322, file: 'src/index.ts', line: 12, column: 14 }],
    declarationGraph: [{ path: 'index.d.ts', digest: DECLARATION_DIGEST, dependencies: [] }],
    emittedPackageSurfaces: [
      { specifier: 'typescript-dual-toolchain-fixture', declaration: 'index.d.ts', digest: DECLARATION_DIGEST },
    ],
    metrics: { wallMs: 12, peakRssBytes: 1024 },
    ...overrides,
  };
}

function observation(
  role: 'compatibility' | 'native',
  overrides: Partial<TypeScriptToolchainObservation> = {},
): TypeScriptToolchainObservation {
  const contract = TYPESCRIPT_TOOLCHAIN_CONTRACT[role];
  return {
    role,
    dependency: contract.dependency,
    packageName: contract.packageName,
    version: contract.version,
    implementationVersion: contract.implementationVersion,
    bin: contract.bin,
    fixtureDigest: FIXTURE_DIGEST,
    requestedWorkers: role === 'native' ? 2 : 1,
    cold: run(),
    warm: run(),
    ...overrides,
  };
}

function qualify(compatibility = observation('compatibility'), native = observation('native')) {
  return qualifyTypeScriptToolchains({
    fixtureDigest: FIXTURE_DIGEST,
    nativeWorkerCeiling: 2,
    compatibility,
    native,
  });
}

describe('TypeScript dual-toolchain qualification', () => {
  it('admits matching diagnostics, declaration graphs, surfaces, and valid measurements', () => {
    const report = qualify();
    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.reportId).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it('reds on a diagnostic identity mismatch instead of filtering it', () => {
    const native = observation('native', {
      warm: run({ diagnostics: [{ code: 2345, file: 'src/index.ts', line: 12, column: 14 }] }),
    });
    const report = qualify(observation('compatibility'), native);
    expect(report.ok).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(['admitted-diagnostic-missing', 'cold-warm-drift', 'diagnostic-mismatch']),
    );
  });

  it('reds when either compiler emits no declaration output', () => {
    const missing = run({ declarationGraph: [], emittedPackageSurfaces: [] });
    const report = qualify(observation('compatibility', { cold: missing, warm: missing }));
    expect(report.ok).toBe(false);
    expect(report.findings.filter((finding) => finding.code === 'missing-output')).toHaveLength(2);
  });

  it('reds on stale package identity or version', () => {
    const report = qualify(observation('compatibility', { packageName: 'typescript', version: '5.9.3', bin: 'tsc' }));
    expect(report.findings).toContainEqual(
      expect.objectContaining({ code: 'stale-toolchain', owner: 'compatibility' }),
    );
  });

  it('reds when a wrapper package launches a different compiler implementation', () => {
    const report = qualify(observation('compatibility', { implementationVersion: '6.0.4' }));
    expect(report.findings).toContainEqual(
      expect.objectContaining({ code: 'stale-toolchain', owner: 'compatibility' }),
    );
  });

  it('reds when the native worker request exceeds the measured ceiling', () => {
    const report = qualify(observation('compatibility'), observation('native', { requestedWorkers: 3 }));
    expect(report.findings).toContainEqual(expect.objectContaining({ code: 'worker-cap-exceeded', owner: 'native' }));
  });

  it('reds on absent peak-memory evidence instead of claiming an unmeasured benchmark', () => {
    const invalid = run({ metrics: { wallMs: 10, peakRssBytes: 0 } });
    const report = qualify(observation('compatibility'), observation('native', { cold: invalid, warm: invalid }));
    expect(report.findings.filter((finding) => finding.code === 'invalid-metric')).toHaveLength(2);
  });

  it('reds when an admitted diagnostic fixture unexpectedly exits cleanly', () => {
    const invalid = run({ exitCode: 0 });
    const report = qualify(observation('compatibility', { cold: invalid, warm: invalid }));
    expect(report.findings.filter((finding) => finding.code === 'unexpected-exit')).toHaveLength(2);
  });

  it('admits nonzero compiler-specific diagnostic exits when the semantic receipt is complete', () => {
    const compatibility = observation('compatibility', { cold: run({ exitCode: 2 }), warm: run({ exitCode: 2 }) });
    const native = observation('native', { cold: run({ exitCode: 2 }), warm: run({ exitCode: 2 }) });
    expect(qualify(compatibility, native).ok).toBe(true);
  });

  it('rejects signal termination even when stale output resembles a complete semantic receipt', () => {
    const signaled = run({ exitCode: 1, signal: 'SIGKILL' });
    const report = qualify(observation('compatibility', { cold: signaled, warm: signaled }));
    expect(report.findings.filter((finding) => finding.code === 'unexpected-exit')).toHaveLength(2);
  });
});

describe('native TypeScript worker policy', () => {
  it('caps local work at two and measures CI from available parallelism', () => {
    expect(resolveNativeTypeScriptWorkers({ ci: false, available: 64 })).toEqual({ requested: 2, ceiling: 2 });
    expect(resolveNativeTypeScriptWorkers({ ci: true, available: 6 })).toEqual({ requested: 3, ceiling: 3 });
    expect(resolveNativeTypeScriptWorkers({ ci: true, available: 64 })).toEqual({ requested: 8, ceiling: 8 });
  });

  it('surfaces invalid and excessive explicit requests to the qualification gate', () => {
    expect(resolveNativeTypeScriptWorkers({ ci: false, available: 8, requested: 'nope' })).toEqual({
      requested: 0,
      ceiling: 2,
    });
    expect(resolveNativeTypeScriptWorkers({ ci: false, available: 8, requested: '3' })).toEqual({
      requested: 3,
      ceiling: 2,
    });
  });
});

describe('side-by-side package ownership', () => {
  it('keeps API imports on TypeScript 6 while the tsc bin comes from the native alias', () => {
    const manifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    expect(manifest.devDependencies['typescript']).toBe('npm:@typescript/typescript6@6.0.2');
    expect(manifest.devDependencies['typescript-native']).toBe('npm:typescript@7.0.2');
    const auditManifest = JSON.parse(readFileSync(resolve('packages/audit/package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(auditManifest.dependencies['typescript']).toBe('npm:@typescript/typescript6@6.0.2');
    expect(PEER_INSTALLS).toContain('typescript@npm:@typescript/typescript6@6.0.2');
    expect(PEER_INSTALLS).not.toContain('typescript@5.9.3');
    for (const script of ['build', 'typecheck', 'typecheck:scripts', 'typecheck:tests', 'typecheck:spine']) {
      expect(manifest.scripts[script]).toContain('scripts/native-tsc.ts');
      expect(manifest.scripts[script]).not.toMatch(/\btsc6\b/u);
    }
  });

  it('loads compiler and TypeDoc APIs through the TypeScript 6 compatibility identity', async () => {
    const [typescript, typedoc] = await Promise.all([import('typescript'), import('typedoc')]);
    expect(typescript.versionMajorMinor).toBe('6.0');
    expect(typescript.createProgram).toBeTypeOf('function');
    expect(typedoc.Application).toBeTypeOf('function');
  });
});

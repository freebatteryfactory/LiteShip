/**
 * Error-contract wave — audit diagnostics teach instead of scold.
 *
 * Every rewritten message carries: what happened, which subject (ids, paths,
 * values), and the literal next step. Also pins the CUT A0 zero-package guard
 * (a run that audited nothing is an ERROR, never a green zero) and the
 * load-bearing `returns <expr>` substring the fallback-laundering allowlist
 * matches on.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import {
  consumerDevopsProfile,
  discoverInstalledPackageRoots,
  readJsonFile,
  runAuditPasses,
  runIntegrityAudit,
  runStructureAudit,
  runSurfaceAudit,
  type DevopsProfile,
} from '@liteship/audit';
import { loadProfile } from '../../../packages/cli/src/lib/load-profile.js';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-errcontract-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const PKG = (name: string, deps: Record<string, string> = {}): string =>
  JSON.stringify({ name, version: '0.0.0', dependencies: deps, exports: { '.': { development: './src/index.ts' } } });

function acmeProfile(root: string, overrides: Partial<DevopsProfile> = {}): DevopsProfile {
  return {
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: {},
    dynamicImportExemptions: new Set<string>(),
    surfacePolicy: {},
    ...overrides,
  };
}

describe('CUT A0 — a run that audited nothing is an error, not a green zero (no-packages-discovered)', () => {
  it('an empty monorepo target yields one support-section error naming both ways out', () => {
    const root = makeFixture({ 'package.json': JSON.stringify({ name: 'empty', private: true }) });
    const result = runAuditPasses(acmeProfile(root));
    const guard = result.findings.filter((f) => f.rule === 'no-packages-discovered');
    expect(guard).toHaveLength(1);
    expect(guard[0]!.id).toBe('support/no-packages');
    expect(guard[0]!.section).toBe('support');
    expect(guard[0]!.severity).toBe('error');
    expect(guard[0]!.summary).toContain('nothing was audited');
    expect(guard[0]!.summary).toContain('--consumer');
    expect(guard[0]!.summary).toContain('--profile');
    expect(result.counts.error).toBeGreaterThanOrEqual(1);
  });

  it('a consumer install with zero topology packages present is the same error, consumer-worded', () => {
    const root = makeFixture({ 'package.json': JSON.stringify({ name: 'site', private: true }) });
    const base = acmeProfile(root, {
      packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
    });
    const result = runAuditPasses(consumerDevopsProfile(root, base));
    const guard = result.findings.filter((f) => f.rule === 'no-packages-discovered');
    expect(guard).toHaveLength(1);
    expect(guard[0]!.summary).toContain('packageTopology');
    expect(guard[0]!.summary).toContain('nothing was audited');
  });

  it('a populated target carries no guard finding (the floor stays clean)', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const result = runAuditPasses(acmeProfile(root));
    expect(result.findings.filter((f) => f.rule === 'no-packages-discovered')).toHaveLength(0);
  });
});

describe('surface pass — host/virtual-module errors name the profile field and the way out', () => {
  it('astro-package-missing names surfacePolicy.astroPackage, the empty opt-out, and --consumer', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const result = runSurfaceAudit(
      acmeProfile(root, { surfacePolicy: { astroPackage: '@acme/astro', astroClientDirectives: ['satellite'] } }),
    );
    const finding = result.findings.find((f) => f.id === 'surface/astro-package-missing');
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain('surfacePolicy.astroPackage');
    expect(finding!.summary).toContain('@acme/astro');
    expect(finding!.summary).toContain('--consumer');
  });

  it('a virtual module absent from the inventory names the list field and the inventory file', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
      'packages/vite/package.json': PKG('@acme/vite'),
      'packages/vite/src/index.ts': 'export const viteReady = 1;\n',
      'packages/vite/src/virtual-modules.ts': "export const ids = ['virtual:acme/other'];\n",
    });
    const result = runSurfaceAudit(
      acmeProfile(root, {
        surfacePolicy: {
          viteVirtualModules: ['virtual:acme/tokens'],
          vitePackage: '@acme/vite',
          viteVirtualModulesFile: 'src/virtual-modules.ts',
        },
      }),
    );
    const finding = result.findings.find((f) => f.id === 'surface/vite-virtual/virtual:acme/tokens');
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain('surfacePolicy.viteVirtualModules');
    expect(finding!.summary).toContain('packages/vite/src/virtual-modules.ts');
    expect(finding!.summary).not.toContain('repo-native');
  });

  it('export-target-missing (consumer dist truth) ends with the literal next step', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': JSON.stringify({
        name: '@acme/core',
        version: '0.0.0',
        exports: { '.': { types: './index.d.ts' } },
      }),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const base = acmeProfile(root, {
      packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
    });
    const result = runSurfaceAudit(consumerDevopsProfile(root, base));
    const finding = result.findings.find((f) => f.rule === 'export-target-missing');
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain('Reinstall the package');
    expect(finding!.summary).toContain("files[]");
  });
});

describe('structure pass — topology and resolution errors say where the law lives', () => {
  it('package-topology violations name packageTopology[pkg].allowedInternalImports and both fixes', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
      'packages/app/package.json': PKG('@acme/app', { '@acme/core': 'workspace:*' }),
      'packages/app/src/index.ts': "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
    });
    const result = runStructureAudit(
      acmeProfile(root, {
        packageTopology: {
          '@acme/app': { allowedInternalImports: [], kind: 'layered' },
          '@acme/core': { allowedInternalImports: [], kind: 'core' },
        },
      }),
    );
    const finding = result.findings.find((f) => f.rule === 'package-topology');
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain("packageTopology['@acme/app'].allowedInternalImports");
    expect(finding!.summary).toContain("Add '@acme/core'");
    expect(finding!.summary).toContain('or remove the import');
    expect(finding!.summary).not.toContain('repo-native');
  });

  it('unresolved relative imports enumerate the real candidate set and the .js→.ts rule', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': "import { gone } from './missing.js';\nexport const coreThing = gone;\n",
    });
    const result = runStructureAudit(acmeProfile(root));
    const finding = result.findings.find((f) => f.rule === 'unresolved-internal-import');
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain('"./missing.js"');
    expect(finding!.summary).toContain('index.ts/index.tsx');
    expect(finding!.summary).toContain('a .js specifier needs a matching .ts source');
  });
});

describe('integrity pass — findings teach the allowlist way out', () => {
  it('console-call points at the diagnostics channel and the allowlist entry shape', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': "console.log('hi');\nexport const coreThing = 1;\n",
    });
    const result = runIntegrityAudit(acmeProfile(root));
    const finding = result.findings.find((f) => f.rule === 'console-call');
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain('console-call allowlist entry');
    expect(finding!.summary).toContain('diagnostics');
    expect(finding!.summary).not.toContain('Diagnostics rather than');
  });

  it('fallback-laundering keeps the load-bearing "returns <expr>" phrase and teaches consumption', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts':
        'function compute(): number { return 2; }\n' +
        'export function bare(): number | null { try { return compute(); } catch { return null; } }\n',
    });
    const result = runIntegrityAudit(acmeProfile(root));
    const finding = result.findings.find((f) => f.rule === 'fallback-laundering');
    expect(finding).toBeDefined();
    // summaryIncludes matchers in shipped + downstream allowlists pin this phrase.
    expect(finding!.summary).toContain('returns null');
    expect(finding!.summary).toContain('Consume the binding before returning');
    expect(finding!.summary).toContain('fallback-laundering allowlist entry');
  });
});

describe('IO seams — raw Node errors gain the subject path', () => {
  it('readJsonFile names the file on malformed JSON and carries the cause', () => {
    const root = makeFixture({ 'broken.json': '{ "name": ' });
    expect(() => readJsonFile(resolve(root, 'broken.json'))).toThrowError(/Could not read .*broken\.json as JSON/);
    expect(() => readJsonFile(resolve(root, 'absent.json'))).toThrowError(/Could not read .*absent\.json as JSON/);
  });

  it('consumer discovery names the bad cwd instead of a bare ENOENT', () => {
    expect(() => discoverInstalledPackageRoots('/definitely/not/a/real/dir', ['@acme/core'])).toThrowError(
      /cannot start from \/definitely\/not\/a\/real\/dir/,
    );
  });
});

describe('CLI profile loader — missing-field errors append a copy-pasteable template', () => {
  it('missing internalPackagePrefix shows the minimal profile', async () => {
    const root = makeFixture({ 'p.json': JSON.stringify({ packageTopology: {} }) });
    await expect(loadProfile(resolve(root, 'p.json'), root)).rejects.toThrowError(/A minimal profile: \{ "internalPackagePrefix"/);
  });

  it('missing packageTopology shows the minimal profile', async () => {
    const root = makeFixture({ 'p.json': JSON.stringify({ internalPackagePrefix: '@acme/' }) });
    await expect(loadProfile(resolve(root, 'p.json'), root)).rejects.toThrowError(/A minimal profile: \{ "internalPackagePrefix"/);
  });
});

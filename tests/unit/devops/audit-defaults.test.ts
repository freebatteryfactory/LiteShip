/**
 * Decision-audit defaults wave — `runAuditPasses({ repoRoot })` just works.
 *
 * Proves: a PARTIAL profile resolves with documented defaults (prefix derived
 * from the single common npm scope, empty topology/exemptions/surface);
 * derivation never guesses (ambiguous or unscoped trees throw a teaching
 * error); every SurfacePolicyShape field is optional (absent = check skipped);
 * the CLI JSON loader accepts a profile without `surfacePolicy`; and consumer
 * mode reports not-installed topology packages as info findings (the README
 * promise, previously discarded by consumerDevopsProfile).
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import {
  consumerDevopsProfile,
  resolveDevopsProfile,
  runAuditPasses,
  runSurfaceAudit,
  type DevopsProfile,
} from '@liteship/audit';
import { loadProfile } from '../../../packages/cli/src/lib/load-profile.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-defaults-'));
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

/** A two-package @acme/ repo: app depends on core. */
function acmeRepo(): string {
  return makeFixture({
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': PKG('@acme/core'),
    'packages/core/src/index.ts': 'export const coreThing = 1;\n',
    'packages/app/package.json': PKG('@acme/app', { '@acme/core': 'workspace:*' }),
    'packages/app/src/index.ts': "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
  });
}

describe('runAuditPasses accepts a partial profile (defaults normalized at the entry point)', () => {
  it('runAuditPasses({ repoRoot }) audits the tree with a derived @acme/ prefix', () => {
    const result = runAuditPasses({ repoRoot: acmeRepo() });
    expect(result.structure.summary.packageCount).toBe(2);
    // The derived prefix makes @acme/ imports INTERNAL edges, not external.
    expect(result.structure.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
    // Empty surface policy by default: no host-surface assumptions.
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
  });

  it('resolveDevopsProfile fills the documented defaults', () => {
    const root = acmeRepo();
    const profile = resolveDevopsProfile({ repoRoot: root });
    expect(profile.internalPackagePrefix).toBe('@acme/');
    expect(profile.packageTopology).toEqual({});
    expect(profile.dynamicImportExemptions.size).toBe(0);
    expect(profile.surfacePolicy).toEqual({});
  });

  it('prefix derivation throws a teaching error when scopes are ambiguous', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const a = 1;\n',
      'packages/other/package.json': PKG('@beta/other'),
      'packages/other/src/index.ts': 'export const b = 1;\n',
    });
    expect(() => resolveDevopsProfile({ repoRoot: root })).toThrowError(/@acme\/, @beta\//);
    expect(() => resolveDevopsProfile({ repoRoot: root })).toThrowError(/internalPackagePrefix/);
  });

  it('prefix derivation throws a teaching error when no scoped manifest exists', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('bare-core'),
      'packages/core/src/index.ts': 'export const a = 1;\n',
    });
    expect(() => resolveDevopsProfile({ repoRoot: root })).toThrowError(/no scoped/);
    expect(() => resolveDevopsProfile({ repoRoot: root })).toThrowError(/runAuditPasses\(\{ repoRoot, internalPackagePrefix/);
  });

  it('an explicit prefix is never second-guessed by derivation', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const a = 1;\n',
      'packages/other/package.json': PKG('@beta/other'),
      'packages/other/src/index.ts': 'export const b = 1;\n',
    });
    const profile = resolveDevopsProfile({ repoRoot: root, internalPackagePrefix: '@acme/' });
    expect(profile.internalPackagePrefix).toBe('@acme/');
  });
});

describe('SurfacePolicyShape — every field is optional, absent = check skipped', () => {
  it('an empty surfacePolicy yields zero host/virtual-module findings and zeroed counts', () => {
    const root = acmeRepo();
    const profile: DevopsProfile = {
      repoRoot: root,
      internalPackagePrefix: '@acme/',
      packageTopology: {},
      dynamicImportExemptions: new Set<string>(),
      surfacePolicy: {},
    };
    const result = runSurfaceAudit(profile);
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
    expect(result.findings.filter((f) => f.rule === 'virtual-module-surface')).toHaveLength(0);
    expect(result.summary.astroDirectiveCount).toBe(0);
    expect(result.summary.astroRuntimeAdapterCount).toBe(0);
    expect(result.summary.viteVirtualModuleCount).toBe(0);
    expect(result.summary.capabilityNotes).toEqual([]);
  });

  it('the CLI JSON loader accepts a profile without surfacePolicy', async () => {
    const root = acmeRepo();
    const profilePath = resolve(root, 'liteship.profile.json');
    writeFileSync(
      profilePath,
      JSON.stringify({ internalPackagePrefix: '@acme/', packageTopology: {} }),
      'utf8',
    );
    const { profile, source } = await loadProfile(profilePath, root);
    expect(source).toBe('file');
    expect(profile.surfacePolicy).toEqual({});
    const result = runSurfaceAudit({ ...profile, repoRoot: root });
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
  });

  it('the reference surfacePolicy const is typed as the consumed shape (no as-const wart)', () => {
    const policySrc = readFileSync(resolve(REPO, 'packages/audit/src/policy.ts'), 'utf8');
    expect(policySrc).toContain('export const surfacePolicy: SurfacePolicyShape');
    const constBody = policySrc.slice(policySrc.indexOf('export const surfacePolicy'));
    expect(constBody.slice(0, constBody.indexOf('};'))).not.toContain('as const');
  });
});

describe('consumer mode — not-installed topology packages surface as info findings', () => {
  it('reports each missing topology package once, as info, never error', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core'),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const base: DevopsProfile = {
      repoRoot: root,
      internalPackagePrefix: '@acme/',
      packageTopology: {
        '@acme/app': { allowedInternalImports: ['@acme/core'], kind: 'layered' },
        '@acme/core': { allowedInternalImports: [], kind: 'core' },
      },
      dynamicImportExemptions: new Set<string>(),
      surfacePolicy: {},
    };
    const result = runAuditPasses(consumerDevopsProfile(root, base));
    const missing = result.findings.filter((f) => f.rule === 'consumer-package-missing');
    expect(missing).toHaveLength(1);
    expect(missing[0]!.id).toBe('support/consumer-missing/@acme/app');
    expect(missing[0]!.severity).toBe('info');
    expect(missing[0]!.section).toBe('support');
    expect(missing[0]!.summary).toContain('@acme/app');
    expect(missing[0]!.summary).toContain('packageTopology');
    expect(result.counts.error).toBe(0);
    expect(result.counts.info).toBeGreaterThanOrEqual(1);
  });

  it('a fully installed topology carries no consumer-package-missing findings', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core'),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const base: DevopsProfile = {
      repoRoot: root,
      internalPackagePrefix: '@acme/',
      packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
      dynamicImportExemptions: new Set<string>(),
      surfacePolicy: {},
    };
    const result = runAuditPasses(consumerDevopsProfile(root, base));
    expect(result.findings.filter((f) => f.rule === 'consumer-package-missing')).toHaveLength(0);
  });
});

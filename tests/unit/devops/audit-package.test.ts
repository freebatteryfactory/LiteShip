/**
 * CUT D9b-1 — @czap/audit is a clean, downstream-installable audit engine.
 *
 * Proves the package exposes the engine surface, that all three passes are
 * driven by a profile supplied THROUGH the package exports (synthetic @acme/),
 * that `profile.repoRoot` is the authoritative target, and that the package
 * source imports neither `scripts/` nor any heavy `@czap/*` runtime package.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import {
  runStructureAudit,
  runIntegrityAudit,
  runSurfaceAudit,
  runAuditPasses,
  liteshipDevopsProfile,
  withRepoRoot,
  type DevopsProfile,
} from '@czap/audit';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const ENGINE_SRC = resolve(REPO, 'packages/audit/src');

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function acmeRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-d9b-'));
  fixtures.push(root);
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': JSON.stringify({ name: '@acme/core', version: '0.0.0', exports: { '.': { development: './src/index.ts' } } }),
    'packages/core/src/index.ts': 'export const coreThing = 1;\n',
    'packages/app/package.json': JSON.stringify({ name: '@acme/app', version: '0.0.0', dependencies: { '@acme/core': 'workspace:*' }, exports: { '.': { development: './src/index.ts' } } }),
    'packages/app/src/index.ts': "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
  };
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

function acmeProfile(root: string): DevopsProfile {
  return {
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: {
      '@acme/app': { allowedInternalImports: ['@acme/core'], kind: 'layered' },
      '@acme/core': { allowedInternalImports: [], kind: 'core' },
    },
    dynamicImportExemptions: new Set<string>(),
    surfacePolicy: { astroPackage: '', astroClientDirectives: [], astroRuntimeFiles: [], viteVirtualModules: [], knownCapabilityNotes: [] },
  };
}

/** Recursively list .ts files under a dir. */
function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? tsFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

describe('D9b-1 — @czap/audit exposes the engine surface', () => {
  it('exports the three passes, the combined runner, and the profile helpers', () => {
    expect(typeof runStructureAudit).toBe('function');
    expect(typeof runIntegrityAudit).toBe('function');
    expect(typeof runSurfaceAudit).toBe('function');
    expect(typeof runAuditPasses).toBe('function');
    expect(typeof withRepoRoot).toBe('function');
    expect(liteshipDevopsProfile.internalPackagePrefix).toBe('@czap/');
  });
});

describe('D9b-1 — a synthetic @acme/ profile drives ALL THREE passes through package exports', () => {
  it('structure treats @acme/* as an internal edge', () => {
    const result = runStructureAudit(acmeProfile(acmeRepo()));
    expect(result.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
    expect(result.summary.packageCount).toBe(2);
  });

  it('surface produces no @czap/ host-surface findings under an empty @acme/ policy', () => {
    const result = runSurfaceAudit(acmeProfile(acmeRepo()));
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
  });

  it('runAuditPasses merges all three passes and counts', () => {
    const result = runAuditPasses(acmeProfile(acmeRepo()));
    expect(result.structure.section).toBe('structure');
    expect(result.integrity.section).toBe('integrity');
    expect(result.surface.section).toBe('surface');
    expect(result.counts.error).toBe(0);
    expect(result.findings.length).toBe(
      result.structure.findings.length + result.integrity.findings.length + result.surface.findings.length,
    );
  });
});

describe('D9b-1 — profile.repoRoot is the authoritative target through the package', () => {
  it('withRepoRoot repoints the LiteShip default at an arbitrary tree', () => {
    const root = acmeRepo();
    // Use the default LiteShip prefix/topology but the fixture root — proves root
    // comes from the profile, not a baked const.
    const result = runStructureAudit(withRepoRoot(liteshipDevopsProfile, root));
    expect(result.summary.packageCount).toBe(2);
  });
});

describe('D9b-1 — @czap/audit dependency hygiene (source-grep)', () => {
  it('no engine source imports from scripts/', () => {
    for (const file of tsFiles(ENGINE_SRC)) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from\s*['"][^'"]*\/scripts\//);
      expect(src, file).not.toMatch(/from\s*['"]\.\.\/\.\.\/\.\.\/scripts/);
    }
  });

  it('no engine source imports a heavy @czap runtime package or bench/coverage dep', () => {
    const forbidden = [
      /from\s*['"]@czap\/core['"]/,
      /from\s*['"]@czap\/edge['"]/,
      /from\s*['"]@czap\/web['"]/,
      /from\s*['"]@czap\/worker['"]/,
      /from\s*['"]tinybench['"]/,
      /from\s*['"]istanbul-lib-coverage['"]/,
    ];
    for (const file of tsFiles(ENGINE_SRC)) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(src, `${file} :: ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

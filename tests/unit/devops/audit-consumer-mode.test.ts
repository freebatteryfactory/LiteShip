/**
 * Consumer mode — @czap/audit against a downstream repo's INSTALLED packages.
 *
 * The engine's claim is "downstream-installable", but discovery used to glob
 * `repoRoot/packages/*` and hardcode `packages/astro` / `packages/vite` path
 * templates, so a consumer repo audited zero packages and ate two hard errors
 * out of the box. These tests prove the `packageRoots` seam: discovery walks
 * node_modules (including pnpm's hidden virtual-store layout), the passes
 * resolve surface paths through the discovered package roots, and the
 * monorepo path stays byte-identical (the floor suites guard that side).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import {
  consumerDevopsProfile,
  discoverInstalledPackageRoots,
  runAuditPasses,
  runSurfaceAudit,
  type DevopsProfile,
} from '@czap/audit';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-consumer-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const PKG = (name: string, deps: Record<string, string> = {}, extraExports: Record<string, unknown> = {}): string =>
  JSON.stringify({
    name,
    version: '0.0.0',
    dependencies: deps,
    exports: { '.': { development: './src/index.ts' }, ...extraExports },
  });

/** Consumer-shaped @acme/ base profile (no Astro/Vite host surface). */
function acmeBase(): DevopsProfile {
  return {
    repoRoot: '.',
    internalPackagePrefix: '@acme/',
    packageTopology: {
      '@acme/app': { allowedInternalImports: ['@acme/core'], kind: 'layered' },
      '@acme/core': { allowedInternalImports: [], kind: 'core' },
    },
    dynamicImportExemptions: new Set<string>(),
    surfacePolicy: {
      astroPackage: '',
      astroClientDirectives: [],
      astroRuntimeFiles: [],
      viteVirtualModules: [],
      knownCapabilityNotes: [],
    },
  };
}

describe('consumer mode — discovery walks node_modules to a fixpoint', () => {
  it('finds nested transitive packages (npm-shaped: dep inside the importer)', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/app/package.json': PKG('@acme/app', { '@acme/core': '0.0.0' }),
      'node_modules/@acme/app/src/index.ts':
        "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
      // Hidden transitive dep: only reachable by re-seeding from @acme/app.
      'node_modules/@acme/app/node_modules/@acme/core/package.json': PKG('@acme/core'),
      'node_modules/@acme/app/node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });

    const discovery = discoverInstalledPackageRoots(root, ['@acme/app', '@acme/core']);
    expect(Object.keys(discovery.packageRoots).sort()).toEqual(['@acme/app', '@acme/core']);
    expect(discovery.missing).toEqual([]);

    const result = runAuditPasses(consumerDevopsProfile(root, acmeBase()));
    expect(result.structure.summary.packageCount).toBe(2);
    expect(result.structure.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
    expect(result.findings.filter((f) => f.rule === 'unknown-internal-package')).toHaveLength(0);
    expect(result.counts.error).toBe(0);
  });

  it('resolves the pnpm virtual-store layout via realpath re-seeding', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/.pnpm/@acme+app@0.0.0/node_modules/@acme/app/package.json': PKG('@acme/app', {
        '@acme/core': '0.0.0',
      }),
      'node_modules/.pnpm/@acme+app@0.0.0/node_modules/@acme/app/src/index.ts':
        "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
      // pnpm: the transitive dep is a SIBLING inside the importer's virtual-store
      // node_modules, invisible from the project's top-level node_modules/@acme.
      'node_modules/.pnpm/@acme+app@0.0.0/node_modules/@acme/core/package.json': PKG('@acme/core'),
      'node_modules/.pnpm/@acme+app@0.0.0/node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const linkPath = join(root, 'node_modules', '@acme', 'app');
    mkdirSync(dirname(linkPath), { recursive: true });
    try {
      symlinkSync(join(root, 'node_modules/.pnpm/@acme+app@0.0.0/node_modules/@acme/app'), linkPath, 'dir');
    } catch {
      // Windows without symlink privilege — the npm-shaped test above covers the walk.
      return;
    }

    const discovery = discoverInstalledPackageRoots(root, ['@acme/app', '@acme/core']);
    expect(Object.keys(discovery.packageRoots).sort()).toEqual(['@acme/app', '@acme/core']);
    // realpath'd through the symlink into the virtual store.
    expect(discovery.packageRoots['@acme/app']).toContain('.pnpm');
    expect(discovery.packageRoots['@acme/core']).toContain('.pnpm');

    const result = runAuditPasses(consumerDevopsProfile(root, acmeBase()));
    expect(result.structure.summary.packageCount).toBe(2);
    expect(result.counts.error).toBe(0);
  });

  it('prunes host-surface policy for packages the consumer never installed', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core'),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    // Base declares an astro host surface + vite virtual modules, but the
    // consumer installed neither — no *-missing errors for unshipped surfaces.
    const base: DevopsProfile = {
      ...acmeBase(),
      surfacePolicy: {
        astroPackage: '@acme/astro',
        astroClientDirectives: ['satellite'],
        astroRuntimeFiles: ['src/runtime/boundary.ts'],
        viteVirtualModules: ['virtual:acme/tokens'],
        vitePackage: '@acme/vite',
        knownCapabilityNotes: [],
      },
    };

    const result = runSurfaceAudit(consumerDevopsProfile(root, base));
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
    expect(result.findings.filter((f) => f.rule === 'virtual-module-surface')).toHaveLength(0);
  });

  it('reports not-installed topology packages as missing, not as errors', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core'),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });

    const discovery = discoverInstalledPackageRoots(root, ['@acme/app', '@acme/core']);
    expect(discovery.missing).toEqual(['@acme/app']);

    const result = runAuditPasses(consumerDevopsProfile(root, acmeBase()));
    expect(result.structure.summary.packageCount).toBe(1);
    expect(result.counts.error).toBe(0);
  });
});

describe('consumer mode — surface checks resolve through discovered package roots', () => {
  function astroHostFixture(opts: { deleteDirective?: boolean } = {}): string {
    return makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/astro/package.json': PKG(
        '@acme/astro',
        {},
        {
          './client-directives/satellite': { development: './src/client-directives/satellite.ts' },
        },
      ),
      'node_modules/@acme/astro/src/index.ts': 'export const astroReady = true;\n',
      ...(opts.deleteDirective
        ? {}
        : {
            'node_modules/@acme/astro/src/client-directives/satellite.ts':
              'export default (load: () => Promise<unknown>, _o: Record<string, unknown>, el: HTMLElement) => {\n  void load;\n  void el;\n};\n',
          }),
      'node_modules/@acme/astro/src/runtime/boundary.ts': 'export const boundaryRuntime = true;\n',
    });
  }

  function astroHostProfile(root: string): DevopsProfile {
    return {
      ...acmeBase(),
      packageTopology: { '@acme/astro': { allowedInternalImports: [], kind: 'host' } },
      surfacePolicy: {
        astroPackage: '@acme/astro',
        astroClientDirectives: ['satellite'],
        astroRuntimeFiles: ['src/runtime/boundary.ts'],
        viteVirtualModules: [],
        knownCapabilityNotes: [],
      },
      repoRoot: root,
    };
  }

  it('a healthy consumer install yields ZERO host-surface errors', () => {
    const root = astroHostFixture();
    const profile = consumerDevopsProfile(root, astroHostProfile(root));
    const result = runSurfaceAudit(profile);
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
    expect(result.summary.packageCount).toBe(1);
  });

  it('a missing directive source fires with a node_modules-relative location', () => {
    const root = astroHostFixture({ deleteDirective: true });
    const profile = consumerDevopsProfile(root, astroHostProfile(root));
    const result = runSurfaceAudit(profile);
    const finding = result.findings.find((f) => f.id === 'surface/astro-file/satellite');
    expect(finding).toBeDefined();
    expect(finding?.location?.file).toContain('node_modules/@acme/astro');
  });
});

describe('consumer mode — no monorepo path templates remain in the passes (source-grep)', () => {
  it('structure.ts carries no packages/astro or packages/vite literals', () => {
    const structure = readFileSync(resolve(REPO, 'packages/audit/src/structure.ts'), 'utf8');
    expect(structure).not.toContain("'packages/astro");
    expect(structure).not.toContain("'packages/vite");
    expect(structure).not.toContain('`packages/astro');
  });

  it('surface.ts resolves astro paths through the package root (vite keeps one documented legacy fallback)', () => {
    const surface = readFileSync(resolve(REPO, 'packages/audit/src/surface.ts'), 'utf8');
    expect(surface).not.toContain('`packages/astro');
    expect(surface).not.toContain("'packages/astro");
    // The single sanctioned legacy literal: the vite fallback for profiles
    // that predate surfacePolicy.vitePackage.
    expect(surface.match(/'packages\/vite\/src\/virtual-modules\.ts'/g)).toHaveLength(1);
  });
});

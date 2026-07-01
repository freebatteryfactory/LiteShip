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
  runIntegrityAudit,
  runStructureAudit,
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

    const result = runStructureAudit(consumerDevopsProfile(root, acmeBase()));
    expect(result.summary.packageCount).toBe(2);
    expect(result.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
    expect(result.findings.filter((f) => f.rule === 'unknown-internal-package')).toHaveLength(0);
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });

  it('does NOT flag unknown-internal-package for a not-discovered transitive @scope import (consumer-scoping fix)', () => {
    // The 0.4.0 consumer regression: a discovered package imports an internal
    // package (e.g. @acme/error, like the new @czap/error) that ISN'T in the
    // discovery seed — transitive/hoisted, or omitted from the topology. In the
    // source monorepo that's a real unknown-internal-package error; in a consumer
    // it's noise the consumer can't act on (it's the vendor's own wiring).
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/app/package.json': PKG('@acme/app', { '@acme/error': '0.0.0' }),
      'node_modules/@acme/app/src/index.ts': "import { fail } from '@acme/error';\nexport const appThing = fail;\n",
      // @acme/error is installed ONLY nested under the importer (pnpm/npm-nested
      // shape) and is NOT in the base topology — reproducing the transitive gap.
      // The installed-check must reach it by re-seeding from @acme/app's root.
      'node_modules/@acme/app/node_modules/@acme/error/package.json': PKG('@acme/error'),
      'node_modules/@acme/app/node_modules/@acme/error/src/index.ts': 'export const fail = 1;\n',
    });

    const base: DevopsProfile = {
      ...acmeBase(),
      packageTopology: { '@acme/app': { allowedInternalImports: [], kind: 'core' } },
    };
    const result = runStructureAudit(consumerDevopsProfile(root, base));
    expect(result.summary.packageCount).toBe(1); // only @acme/app discovered
    expect(result.findings.filter((f) => f.rule === 'unknown-internal-package')).toHaveLength(0);
    // The suppressed-but-real edge is still recorded in the graph (Greptile P1).
    expect(result.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/error', count: 1 });
  });

  it('STILL flags a NOT-declared (typo/missing) internal import in consumer mode (Codex P2)', () => {
    // The suppression must not hide real breakage: an import to an internal
    // package that ISN'T a declared dependency (a typo, or a genuinely missing
    // package) won't resolve at the consumer's runtime, so it stays an error
    // even in consumer mode. Only declared-but-undiscovered deps are suppressed.
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      // @acme/app declares NO deps, yet imports @acme/erorr (a typo).
      'node_modules/@acme/app/package.json': PKG('@acme/app'),
      'node_modules/@acme/app/src/index.ts': "import { x } from '@acme/erorr';\nexport const y = x;\n",
    });
    const base: DevopsProfile = {
      ...acmeBase(),
      packageTopology: { '@acme/app': { allowedInternalImports: [], kind: 'core' } },
    };
    const result = runStructureAudit(consumerDevopsProfile(root, base));
    expect(result.findings.filter((f) => f.rule === 'unknown-internal-package').length).toBeGreaterThan(0);
  });

  it('STILL flags a DECLARED-but-NOT-installed dep in consumer mode (installed-check, not just declared)', () => {
    // Codex P2 #2: "declared" isn't enough — a dep can be declared yet absent
    // from the shipped install (e.g. a devDependency, or a broken install), so
    // the import won't resolve at runtime. Suppression keys on ACTUAL install
    // presence, so this still flags even though @acme/ghost is in the manifest.
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/app/package.json': PKG('@acme/app', { '@acme/ghost': '0.0.0' }),
      'node_modules/@acme/app/src/index.ts': "import { g } from '@acme/ghost';\nexport const z = g;\n",
      // @acme/ghost is declared above but deliberately NOT installed here.
    });
    const base: DevopsProfile = {
      ...acmeBase(),
      packageTopology: { '@acme/app': { allowedInternalImports: [], kind: 'core' } },
    };
    const result = runStructureAudit(consumerDevopsProfile(root, base));
    expect(result.findings.filter((f) => f.rule === 'unknown-internal-package').length).toBeGreaterThan(0);
  });

  it('STILL flags a DISALLOWED layering edge (package-topology) in consumer mode', () => {
    // #4: the consumer suppression targets unresolvable/undiscovered imports — it
    // must NOT swallow a real LAYERING violation between two INSTALLED packages.
    // @acme/core (a core layer, no allowed internal imports) imports @acme/app:
    // both resolve, so this is not unknown-internal-package — it is a topology
    // breach that stays a hard error even in consumer mode. (Wave-2: this was the
    // one error class the existing suite did not already pin.)
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/app/package.json': PKG('@acme/app', { '@acme/core': '0.0.0' }),
      'node_modules/@acme/app/src/index.ts': 'export const appThing = 1;\n',
      // @acme/core declares + imports @acme/app — a real, resolvable edge that
      // VIOLATES core's empty allowedInternalImports.
      'node_modules/@acme/core/package.json': PKG('@acme/core', { '@acme/app': '0.0.0' }),
      'node_modules/@acme/core/src/index.ts':
        "import { appThing } from '@acme/app';\nexport const coreThing = appThing;\n",
    });
    const result = runStructureAudit(consumerDevopsProfile(root, acmeBase()));
    expect(
      result.findings.filter((f) => f.rule === 'package-topology').length,
      'a disallowed @acme/core -> @acme/app edge must red as package-topology in consumer mode',
    ).toBeGreaterThan(0);
  });

  it('runAuditPasses skips the structure pass in consumer aggregate mode', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/app/package.json': PKG('@acme/app', { '@acme/core': '0.0.0' }),
      'node_modules/@acme/app/src/index.ts': 'export const appThing = 1;\n',
      'node_modules/@acme/core/package.json': PKG('@acme/core', { '@acme/app': '0.0.0' }),
      'node_modules/@acme/core/src/index.ts':
        "import { appThing } from '@acme/app';\nexport const coreThing = appThing;\n",
    });
    const profile = consumerDevopsProfile(root, acmeBase());

    expect(runStructureAudit(profile).findings.filter((f) => f.rule === 'package-topology').length).toBeGreaterThan(0);

    const aggregate = runAuditPasses(profile);
    expect(aggregate.structure.findings).toHaveLength(0);
    expect(aggregate.findings.filter((f) => f.rule === 'package-topology')).toHaveLength(0);
    expect(aggregate.counts.error).toBe(0);
  });

  it('STILL flags unknown-internal-package in SOURCE mode (the suppression is consumer-specific, not a blanket removal)', () => {
    const srcRoot = makeFixture({
      'packages/app/package.json': PKG('@acme/app'),
      'packages/app/src/index.ts': "import { fail } from '@acme/missing';\nexport const x = fail;\n",
    });
    // A SOURCE profile (no packageRoots) audits the monorepo's own packages/* —
    // a missing internal import is a real structural error here.
    const sourceResult = runStructureAudit({
      ...acmeBase(),
      repoRoot: srcRoot,
      packageTopology: { '@acme/app': { allowedInternalImports: [], kind: 'core' } },
    });
    expect(sourceResult.findings.filter((f) => f.rule === 'unknown-internal-package').length).toBeGreaterThan(0);
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

    const result = runStructureAudit(consumerDevopsProfile(root, acmeBase()));
    expect(result.summary.packageCount).toBe(2);
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
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

describe('consumer mode — installed exports targets are verified (dist truth)', () => {
  it('a declared dist target missing from the installed package is an error', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core', {}, {
        './extra': { types: './dist/extra.d.ts', import: './dist/extra.js', development: './src/extra.ts' },
      }),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
      'node_modules/@acme/core/src/extra.ts': 'export const extra = 1;\n',
      // dist/extra.d.ts exists; dist/extra.js deliberately does NOT.
      'node_modules/@acme/core/dist/extra.d.ts': 'export declare const extra: number;\n',
    });
    const result = runSurfaceAudit(consumerDevopsProfile(root, acmeBase()));
    const missing = result.findings.filter((f) => f.rule === 'export-target-missing');
    expect(missing).toHaveLength(1);
    expect(missing[0]!.id).toBe('surface/export-target/@acme/core:./extra:import');
    expect(missing[0]!.severity).toBe('error');
    expect(missing[0]!.location?.file).toContain('node_modules/@acme/core');
  });

  it('a types-only export (no development/import condition) is still verified (Codex P2)', () => {
    // The @czap/_spine shape: { ".": { types: "./index.d.ts" } }. The
    // development-candidate gate must not skip it in consumer mode.
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': JSON.stringify({
        name: '@acme/core',
        version: '0.0.0',
        exports: { '.': { types: './index.d.ts' } },
      }),
      // index.d.ts deliberately absent.
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const result = runSurfaceAudit(consumerDevopsProfile(root, acmeBase()));
    const missing = result.findings.filter((f) => f.rule === 'export-target-missing');
    expect(missing).toHaveLength(1);
    expect(missing[0]!.id).toBe('surface/export-target/@acme/core:.:types');
  });

  it('a fully shipped install (all conditions resolve) carries no export-target findings', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core', {}, {
        './extra': { types: './dist/extra.d.ts', import: './dist/extra.js', development: './src/extra.ts' },
        // Wildcard subpaths and fallback arrays are tolerated shapes.
        './wild/*': { import: './dist/wild/*.js' },
        './fallback': ['./dist/fallback.js', './src/fallback.ts'],
      }),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
      'node_modules/@acme/core/src/extra.ts': 'export const extra = 1;\n',
      'node_modules/@acme/core/src/fallback.ts': 'export const fb = 1;\n',
      'node_modules/@acme/core/dist/extra.d.ts': 'export declare const extra: number;\n',
      'node_modules/@acme/core/dist/extra.js': 'export const extra = 1;\n',
      'node_modules/@acme/core/dist/fallback.js': 'export const fb = 1;\n',
    });
    const result = runSurfaceAudit(consumerDevopsProfile(root, acmeBase()));
    expect(result.findings.filter((f) => f.rule === 'export-target-missing')).toHaveLength(0);
  });

  it('a missing development target does not double-report (package-export-surface owns it)', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@acme/core/package.json': PKG('@acme/core', {}, {
        './gone': { development: './src/gone.ts' },
      }),
      'node_modules/@acme/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const result = runSurfaceAudit(consumerDevopsProfile(root, acmeBase()));
    expect(result.findings.filter((f) => f.rule === 'package-export-surface')).toHaveLength(1);
    expect(result.findings.filter((f) => f.rule === 'export-target-missing')).toHaveLength(0);
  });

  it('the monorepo default profile (no packageRoots) never runs the dist check', () => {
    // dist/ legitimately may not exist on a fresh clone; the floor suites pin
    // 0 errors for the default profile, which this rule must not disturb.
    const result = runSurfaceAudit();
    expect(result.findings.filter((f) => f.rule === 'export-target-missing')).toHaveLength(0);
  });
});

describe('consumer mode — allowlist entries follow the package, not the monorepo layout', () => {
  // 0.1.5 re-dogfood report: a clean consumer install read 24 warnings, every
  // one a finding the monorepo allowlist already suppresses. Root cause: the
  // entries matched repo-relative `packages/...` prefixes, which can never
  // match a node_modules path. Entries now carry `{ package, filePrefix }`
  // (package-relative), resolved through the profile's discovered roots.

  function czapBase(topology: Record<string, { allowedInternalImports: string[]; kind: 'standalone' }>): DevopsProfile {
    return {
      ...acmeBase(),
      internalPackagePrefix: '@czap/',
      packageTopology: topology,
    };
  }

  const STANDALONE = { allowedInternalImports: [] as string[], kind: 'standalone' as const };

  it('suppresses default-export on an installed @czap/astro client directive (report finding 1)', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@czap/astro/package.json': PKG('@czap/astro'),
      'node_modules/@czap/astro/src/index.ts': 'export const astroReady = true;\n',
      'node_modules/@czap/astro/src/client-directives/satellite.ts':
        'export default (load: () => Promise<unknown>, _opts: Record<string, unknown>, el: HTMLElement) => {\n  void load;\n  void el;\n};\n',
    });
    const result = runStructureAudit(consumerDevopsProfile(root, czapBase({ '@czap/astro': STANDALONE })));
    expect(result.findings.filter((f) => f.rule === 'default-export')).toHaveLength(0);
    const suppressed = result.suppressed.filter((s) => s.rule === 'default-export');
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0]!.finding.location?.file).toContain('node_modules/@czap/astro/src/client-directives/satellite.ts');
  });

  it('does NOT flag the audit policy prose self-mention in an installed @czap/audit — precise detector, no allowlist entry needed (report finding 2)', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@czap/audit/package.json': PKG('@czap/audit'),
      'node_modules/@czap/audit/src/index.ts': 'export const auditReady = true;\n',
      'node_modules/@czap/audit/src/policy.ts':
        "export const stubReason = 'documented placeholder stubs populated by the transform pipeline';\n",
    });
    const result = runIntegrityAudit(consumerDevopsProfile(root, czapBase({ '@czap/audit': STANDALONE })));
    // The string literal merely NAMES the forbidden word; it is not a placeholder.
    // The precise detector (form-based: directive comments + lorem-ipsum, never a
    // marker word inside a string) flags it nowhere AND needs no allowlist
    // suppression — the laundering entry was deleted. So findings AND suppressed
    // are both 0: the detector is correct by FORM, not by grandfathering.
    expect(result.findings.filter((f) => f.rule === 'placeholder-content')).toHaveLength(0);
    expect(result.suppressed.filter((s) => s.rule === 'placeholder-content')).toHaveLength(0);
  });

  it('suppresses the workspace-guard fail-closed fallback in an installed @czap/cli (report finding 3)', () => {
    // The guard moved from commands/doctor.ts to lib/workspace.ts when
    // gauntlet started sharing it — the allowlist entry follows the code.
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@czap/cli/package.json': PKG('@czap/cli'),
      'node_modules/@czap/cli/src/index.ts': 'export const cliReady = true;\n',
      'node_modules/@czap/cli/src/lib/workspace.ts':
        'export function isWorkspace(read: () => string): boolean {\n' +
        '  try {\n' +
        "    return read() === 'czap';\n" +
        '  } catch {\n' +
        '    return false;\n' +
        '  }\n' +
        '}\n',
    });
    const result = runIntegrityAudit(consumerDevopsProfile(root, czapBase({ '@czap/cli': STANDALONE })));
    expect(result.findings.filter((f) => f.rule === 'fallback-laundering')).toHaveLength(0);
    expect(result.suppressed.filter((s) => s.rule === 'fallback-laundering')).toHaveLength(1);
  });

  it('does NOT suppress the same file shape under a different package (entries pin the package name)', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'consumer-site', private: true, type: 'module' }),
      'node_modules/@czap/web/package.json': PKG('@czap/web'),
      'node_modules/@czap/web/src/index.ts': 'export const webReady = true;\n',
      // Same package-relative path + same catch shape as the allowlisted
      // @czap/cli doctor entry — but in @czap/web, so it must stay a finding.
      'node_modules/@czap/web/src/commands/doctor.ts':
        'export function isWorkspace(read: () => string): boolean {\n' +
        '  try {\n' +
        "    return read() === 'czap';\n" +
        '  } catch {\n' +
        '    return false;\n' +
        '  }\n' +
        '}\n',
    });
    const result = runIntegrityAudit(consumerDevopsProfile(root, czapBase({ '@czap/web': STANDALONE })));
    expect(result.findings.filter((f) => f.rule === 'fallback-laundering')).toHaveLength(1);
    expect(result.suppressed.filter((s) => s.rule === 'fallback-laundering')).toHaveLength(0);
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

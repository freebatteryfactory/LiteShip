/**
 * CUT D9a — the audit profile seam is complete end-to-end.
 *
 * D7 threaded the profile through `runStructureAudit` only. D9a finishes the job:
 *   • integrity + surface honor the supplied profile (no hardcoded `@czap/`);
 *   • `profile.repoRoot` is the single, authoritative audit target — no parallel
 *     `root` param that silently shadows it;
 *   • the default LiteShip profile reproduces the engine floor byte-for-byte.
 *
 * The decoupling is PROVEN by feeding a synthetic `@acme/` profile to the SAME
 * engines and watching all three passes follow it — not just structure.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { runStructureAudit } from '../../../scripts/audit/structure.js';
import { runIntegrityAudit } from '../../../scripts/audit/integrity.js';
import { runSurfaceAudit } from '../../../scripts/audit/surface.js';
import {
  AUDIT_WARNING_FLOOR,
  collectWarningInventory,
  diffInventories,
} from '../../../scripts/lib/audit-floor.js';
import { buildCodebaseAuditReport } from '../../../scripts/audit/report.js';
import { liteshipDevopsProfile, withRepoRoot } from '../../../scripts/config/devops-profile.js';
import type { DevopsProfile } from '../../../scripts/config/devops-profile.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-d9a-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

/** A downstream project's profile — `@acme/` prefix, EMPTY surface policy (no Astro/Vite host). */
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

describe('D9a — surface audit honors the profile (the @czap/ host-surface leak is gone)', () => {
  it('an @acme/ profile (empty surfacePolicy) yields ZERO host-surface findings', () => {
    const result = runSurfaceAudit(acmeProfile(acmeRepo()));
    expect(result.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
    expect(result.findings.filter((f) => f.rule === 'virtual-module-surface')).toHaveLength(0);
  });

  it('the LiteShip default profile STILL asserts its Astro/Vite host surface (no behavior loss)', () => {
    const summary = runSurfaceAudit().summary;
    expect(summary.astroDirectiveCount).toBeGreaterThan(0);
    expect(summary.viteVirtualModuleCount).toBeGreaterThan(0);
  });
});

describe('D9a — integrity audit honors profile.internalPackagePrefix', () => {
  it('flags an unused @acme/ internal import beside local impl (suspicious-reimplementation)', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
      'packages/app/package.json': PKG('@acme/app', { '@acme/core': 'workspace:*' }),
      'packages/app/src/index.ts':
        "import { coreThing } from '@acme/core';\nexport function appThing(): number { return 41 + 1; }\n",
    });
    const result = runIntegrityAudit(acmeProfile(root));
    expect(result.findings.some((f) => f.rule === 'suspicious-reimplementation')).toBe(true);
  });

  it('does NOT treat a @czap/ import as internal under an @acme/ profile', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
      'packages/app/package.json': PKG('@acme/app'),
      // Imports @czap/ — under an @acme profile this is EXTERNAL, so no
      // internal-import bookkeeping → no reimplementation smell from it.
      'packages/app/src/index.ts':
        "import { whatever } from '@czap/core';\nexport function appThing(): number { return 41 + 1; }\n",
    });
    const result = runIntegrityAudit(acmeProfile(root));
    expect(result.findings.some((f) => f.rule === 'suspicious-reimplementation')).toBe(false);
  });
});

describe('D9a — profile.repoRoot is the authoritative audit target', () => {
  it('runStructureAudit audits profile.repoRoot — the fixture tree, not the LiteShip repo', () => {
    const result = runStructureAudit(acmeProfile(acmeRepo()));
    // Exactly the fixture's two packages — proves root came from the profile.
    expect(result.summary.packageCount).toBe(2);
    expect(result.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
  });

  it('withRepoRoot repoints the LiteShip default without a parallel root argument', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@czap/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
    });
    const result = runStructureAudit(withRepoRoot(liteshipDevopsProfile, root));
    expect(result.summary.packageCount).toBe(1);
  });
});

describe('D9a — the whole bundle decouples (all three passes follow the profile)', () => {
  it('buildCodebaseAuditReport on an @acme/ repo carries no @czap/ host-surface error and roots at the profile', () => {
    const report = buildCodebaseAuditReport({ profile: acmeProfile(acmeRepo()), generatedAt: '2026-05-26T00:00:00.000Z' });
    expect(report.surface.findings.filter((f) => f.rule === 'host-surface')).toHaveLength(0);
    expect(report.structure.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
    expect(report.root).toBe('.');
  });
});

describe('D9a/D9b — no repo-local @czap/ gate remains in the audit engine (source-grep)', () => {
  // CUT D9b-1 relocated the engine into @czap/audit; report.ts (the HICP bundle)
  // stays repo-local, so its test-import classifier is still greppable in scripts.
  it('integrity + report classify by profile prefix, not a @czap/ literal', () => {
    const integrity = readFileSync(resolve(REPO, 'packages/audit/src/integrity.ts'), 'utf8');
    expect(integrity).not.toMatch(/startsWith\(\s*['"]@czap\//);
    expect(integrity).toContain('profile.internalPackagePrefix');

    const report = readFileSync(resolve(REPO, 'scripts/audit/report.ts'), 'utf8');
    expect(report).not.toMatch(/startsWith\(\s*['"]@czap\//);
  });

  it('surface reads its surface policy from the profile, not the policy const', () => {
    const surface = readFileSync(resolve(REPO, 'packages/audit/src/surface.ts'), 'utf8');
    expect(surface).not.toMatch(/import\s*\{[^}]*\bsurfacePolicy\b[^}]*\}\s*from\s*['"]\.\/policy\.js['"]/);
    expect(surface).toMatch(/const\s*\{\s*surfacePolicy\s*\}\s*=\s*profile/);
  });

  it('the @czap/ prefix literal lives only in the default profile (single source)', () => {
    const profileSrc = readFileSync(resolve(REPO, 'packages/audit/src/devops-profile.ts'), 'utf8');
    expect(profileSrc).toContain("internalPackagePrefix: '@czap/'");
  });
});

describe('D9a — default-profile engine floor is unchanged (no drift)', () => {
  // The artifact-INDEPENDENT engine floor: the three audit passes on the real
  // repo with the default profile. (The full `pnpm run audit` gate adds
  // artifact-dependent supporting findings on top — those are gated elsewhere.)
  it('the real repo holds 0 errors / 0 warnings across structure+integrity+surface', () => {
    const all = [
      ...runStructureAudit().findings,
      ...runIntegrityAudit().findings,
      ...runSurfaceAudit().findings,
    ];
    const bySeverity = (s: string) => all.filter((f) => f.severity === s).length;
    const inventory = collectWarningInventory();
    const delta = diffInventories(AUDIT_WARNING_FLOOR, inventory);
    // Hard floor — D9a must not move these.
    expect(bySeverity('error')).toBe(0);
    expect(bySeverity('warning')).toBe(0);
    expect(inventory).toEqual(AUDIT_WARNING_FLOOR);
    expect(delta.added, `added warnings: ${delta.added.join(', ')}`).toEqual([]);
    expect(delta.removed, `removed warnings: ${delta.removed.join(', ')}`).toEqual([]);
    // info is tracked-file-count sensitive — loose by design (Decision 5).
    expect(bySeverity('info')).toBeGreaterThanOrEqual(1);
  }, scaledTimeout(60_000));
  // (Default-profile == implicit-default reproduction is structurally guaranteed —
  // the default param IS liteshipDevopsProfile — and the structure pass is already
  // pinned in tests/unit/devops/profile.test.ts. The 0/6 floor above is the live
  // no-drift guard across all three passes.)
});

describe('fallback-laundering — the error-binding rule (advisory cleanup wave)', () => {
  const HELPERS =
    'function emit(msg: string): void { void msg; }\n' +
    'function compute(): number { return 2; }\n';

  const fixtureWith = (body: string): string =>
    makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': HELPERS + body,
    });

  const launderingIn = (root: string) =>
    runIntegrityAudit(acmeProfile(root)).findings.filter((f) => f.rule === 'fallback-laundering');

  it('a catch that CONSUMES its error binding before returning a default is not laundering', () => {
    // The ship.ts shape: emitError(e) then return exit code 1. Context is
    // surfaced; the default return is a deliberate degradation contract.
    const root = fixtureWith(
      'export function consumed(): number { try { return compute(); } catch (e) { emit(String(e)); return 1; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(0);
  });

  it('a bare catch returning a default still flags (error ignored entirely)', () => {
    const root = fixtureWith(
      'export function bare(): number | null { try { return compute(); } catch { return null; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(1);
  });

  it('a DECLARED but unreferenced error binding still flags (declaring is not consuming)', () => {
    const root = fixtureWith(
      'export function unused(): number | null { try { return compute(); } catch (e) { return null; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(1);
  });

  it('`void e` is a discard, not consumption — still flags (Qodo, PR #11)', () => {
    const root = fixtureWith(
      'export function discards(): number | null { try { return compute(); } catch (e) { void e; return null; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(1);
  });

  it('a shadowing declaration inside the catch gets no credit — still flags', () => {
    const root = fixtureWith(
      'export function shadows(): number | null { try { return compute(); } catch (e) { { const e = compute(); emit(String(e)); } return null; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(1);
  });

  it('a same-name property access is not a read of the binding — still flags', () => {
    const root = fixtureWith(
      'const holder = { e: 1 };\n' +
        'export function propertyOnly(): number | null { try { return compute(); } catch (e) { emit(String(holder.e)); return null; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(1);
  });

  it('a catch that rethrows keeps its existing exemption', () => {
    const root = fixtureWith(
      'export function rethrows(): number | null { try { return compute(); } catch { if (compute() > 1) { throw new Error(\'up\'); } return null; } }\n',
    );
    expect(launderingIn(root)).toHaveLength(0);
  });
});

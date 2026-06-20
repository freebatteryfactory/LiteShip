/**
 * CUT D7 — the devops config/profile seam, proven on the AUDIT engine.
 *
 * The default `liteshipDevopsProfile` references the existing policy consts, so
 * threading it through the structure audit reproduces current behavior exactly.
 * A synthetic `@acme/` profile fed to the SAME engine proves the audit is no
 * longer hardcoded to `@czap/` — the decoupling is real, not cosmetic.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { runStructureAudit } from '../../../scripts/audit/structure.js';
import { repoRoot } from '../../../scripts/audit/shared.js';
import { packageTopology, surfacePolicy, dynamicImportExemptions } from '../../../scripts/audit/policy.js';
import { liteshipDevopsProfile } from '@czap/audit';
import type { DevopsProfile } from '@czap/audit';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Write a temp repo of `{ 'packages/<x>/...': contents }` and return its root. */
function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-d7-'));
  fixtures.push(root);
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

const PKG = (name: string, deps: Record<string, string> = {}): string =>
  JSON.stringify({ name, version: '0.0.0', dependencies: deps, exports: { '.': { development: './src/index.ts' } } });

describe('D7 — the default profile references the existing policy consts (single source)', () => {
  it('liteshipDevopsProfile aggregates the policy consts verbatim + owns the @czap/ prefix', () => {
    expect(liteshipDevopsProfile.packageTopology).toEqual(packageTopology);
    expect(liteshipDevopsProfile.dynamicImportExemptions).toEqual(dynamicImportExemptions);
    expect(liteshipDevopsProfile.surfacePolicy).toEqual(surfacePolicy);
    expect(liteshipDevopsProfile.internalPackagePrefix).toBe('@czap/');
    expect(liteshipDevopsProfile.repoRoot).toBe(repoRoot);
  });
});

describe('D7 — default profile reproduces current audit behavior (no drift)', () => {
  it('runStructureAudit with the explicit default profile equals the implicit-default run', () => {
    const implicit = runStructureAudit();
    const explicit = runStructureAudit(liteshipDevopsProfile);
    expect(explicit.findings).toEqual(implicit.findings);
    expect(explicit.suppressed).toEqual(implicit.suppressed);
    expect(explicit.summary.coverageClassification).toEqual(implicit.summary.coverageClassification);
    expect(explicit.summary.packageEdges).toEqual(implicit.summary.packageEdges);
  });
});

describe('D7 — a synthetic @acme/ profile drives the audit (decoupling proof)', () => {
  it('treats @acme/* as an INTERNAL package edge — not external (the @czap/ hardcode is gone)', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
      'packages/app/package.json': PKG('@acme/app', { '@acme/core': 'workspace:*' }),
      'packages/app/src/index.ts': "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
    });
    const result = runStructureAudit(acmeProfile(root));
    expect(result.summary.packageEdges).toContainEqual({ from: '@acme/app', to: '@acme/core', count: 1 });
  });

  it('a layering-LEGAL @acme import produces no package-topology finding', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts': 'export const coreThing = 1;\n',
      'packages/app/package.json': PKG('@acme/app', { '@acme/core': 'workspace:*' }),
      'packages/app/src/index.ts': "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
    });
    const result = runStructureAudit(acmeProfile(root));
    expect(result.findings.some((f) => f.rule === 'package-topology')).toBe(false);
  });

  it('a layering-VIOLATING @acme import IS flagged — the profile, not the @czap hardcode, decides', () => {
    const root = makeFixture({
      'packages/core/package.json': PKG('@acme/core', { '@acme/app': 'workspace:*' }),
      'packages/core/src/index.ts': "import { appThing } from '@acme/app';\nexport const coreThing = appThing;\n",
      'packages/app/package.json': PKG('@acme/app'),
      'packages/app/src/index.ts': 'export const appThing = 1;\n',
    });
    const result = runStructureAudit(acmeProfile(root));
    const violation = result.findings.find((f) => f.rule === 'package-topology');
    expect(violation, 'core importing app violates the synthetic topology').toBeDefined();
    expect(violation!.metadata?.packageName).toBe('@acme/core');
  });
});

describe('D7 — default profile self-consistency', () => {
  it('every topology entry uses a known kind', () => {
    for (const policy of Object.values(liteshipDevopsProfile.packageTopology)) {
      expect(['core', 'layered', 'host-adjacent', 'standalone']).toContain(policy.kind);
    }
  });
  it('every dynamic-import exemption is "<pkg> -> <pkg>" with both sides internally-prefixed', () => {
    for (const edge of liteshipDevopsProfile.dynamicImportExemptions) {
      expect(edge).toMatch(/^@czap\/\S+ -> @czap\/\S+$/);
    }
  });
});

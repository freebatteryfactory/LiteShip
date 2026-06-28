/**
 * Anti-rot gate for the generated README registry blocks and the package
 * documentation roster. Source of truth is package.json descriptions +
 * scripts/lib/doc-registry.ts + the committed bench snapshot; this test fails if
 * the committed README drifts from a regenerate, or if a publishable package
 * falls out of the registry / loses its README / lacks a PACKAGE-SURFACES section.
 *
 * Run `pnpm run docs:gen` to refresh README after editing a description, adding
 * a package, or refreshing benchmarks/readme-snapshot.json.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REPO_ROOT,
  loadPackageManifests,
  renderPackagesBlock,
  renderExamplesBlock,
  PACKAGE_GROUPS,
  PROSE_ONLY,
  NO_SURFACE_SECTION,
} from '../../../scripts/lib/doc-registry.js';
import { renderBenchBlock } from '../../../scripts/lib/bench-snapshot.js';

const README = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');

/** Extract the inner content of a `<!-- BEGIN NAME ... --> ... <!-- END NAME -->` block. */
function blockInner(name: string): string {
  const re = new RegExp(`<!-- BEGIN ${name}[^]*?-->\\n([^]*?)\\n<!-- END ${name} -->`);
  const m = README.match(re);
  if (!m) throw new Error(`README block "${name}" not found`);
  return m[1]!;
}

describe('doc-registry — generated README blocks match their source of truth', () => {
  it('the PACKAGES block matches a regenerate (run `pnpm run docs:gen`)', () => {
    expect(blockInner('PACKAGES')).toBe(renderPackagesBlock());
  });
  it('the EXAMPLES block matches a regenerate (run `pnpm run docs:gen`)', () => {
    expect(blockInner('EXAMPLES')).toBe(renderExamplesBlock());
  });
  it('the BENCH block matches a regenerate from benchmarks/readme-snapshot.json', () => {
    expect(blockInner('BENCH')).toBe(renderBenchBlock());
  });
});

describe('doc-registry — every publishable package is accounted for', () => {
  const publishable = loadPackageManifests().filter((p) => p.publishable);
  const grouped = new Set(PACKAGE_GROUPS.flatMap((g) => g.members));

  it('lands in exactly one README package group or the prose-only allowlist', () => {
    for (const pkg of publishable) {
      const inGroup = grouped.has(pkg.name);
      const inProse = (PROSE_ONLY as readonly string[]).includes(pkg.name);
      expect(inGroup !== inProse, `${pkg.name} must be in exactly one of {package group, PROSE_ONLY}`).toBe(true);
    }
  });

  it('no group lists a package that does not exist / is not publishable', () => {
    const byName = new Map(publishable.map((p) => [p.name, p]));
    for (const name of grouped) {
      expect(byName.has(name), `package group lists non-publishable/unknown "${name}"`).toBe(true);
    }
  });

  it('carries a non-empty package.json description (the table cell source)', () => {
    for (const pkg of publishable) {
      expect(pkg.description.trim().length, `${pkg.name} needs a package.json description`).toBeGreaterThan(0);
    }
  });

  it('ships a README.md (published to npm)', () => {
    for (const pkg of publishable) {
      expect(existsSync(resolve(REPO_ROOT, 'packages', pkg.dir, 'README.md')), `${pkg.name} is missing README.md`).toBe(
        true,
      );
    }
  });
});

describe('doc-registry — PACKAGE-SURFACES.md covers every import surface', () => {
  const surfaces = readFileSync(resolve(REPO_ROOT, 'PACKAGE-SURFACES.md'), 'utf8');
  const noSection = new Set<string>(NO_SURFACE_SECTION);
  const importSurfaces = loadPackageManifests().filter(
    (p) => p.publishable && p.name.startsWith('@czap/') && !noSection.has(p.name),
  );

  it('has a section for every @czap import-surface package (except documented type-only spines)', () => {
    for (const pkg of importSurfaces) {
      expect(surfaces.includes(`## \`${pkg.name}\``), `PACKAGE-SURFACES.md is missing a section for ${pkg.name}`).toBe(
        true,
      );
    }
  });
});

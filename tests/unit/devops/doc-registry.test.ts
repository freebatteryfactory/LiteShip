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
import { renderWireContractDoc } from '../../../packages/web/src/wire/render-contract-doc.js';
import {
  renderCheckProfiles,
  renderCliCommandCatalog,
  renderMcpToolCatalog,
} from '../../../scripts/lib/command-docs.js';

// Normalize CRLF so a Windows checkout (autocrlf) doesn't fail the block match
// against the `\n`-joined render output.
const README = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
const ARCHITECTURE = readFileSync(resolve(REPO_ROOT, 'ARCHITECTURE.md'), 'utf8').replace(/\r\n/g, '\n');
const WEB_README = readFileSync(resolve(REPO_ROOT, 'packages/web/README.md'), 'utf8').replace(/\r\n/g, '\n');
const CLI_README = readFileSync(resolve(REPO_ROOT, 'packages/cli/README.md'), 'utf8').replace(/\r\n/g, '\n');
const MCP_README = readFileSync(resolve(REPO_ROOT, 'packages/mcp-server/README.md'), 'utf8').replace(/\r\n/g, '\n');

/** Extract the inner content of a `<!-- BEGIN NAME ... --> ... <!-- END NAME -->` block. */
function blockInner(name: string, source: string = README): string {
  const re = new RegExp(`<!-- BEGIN ${name}[^]*?-->\\n([^]*?)\\n<!-- END ${name} -->`);
  const m = source.match(re);
  if (!m) throw new Error(`block "${name}" not found`);
  return m[1]!;
}

describe('doc-registry — generated blocks match their source of truth', () => {
  it('the PACKAGES block (in ARCHITECTURE.md) matches a regenerate (run `pnpm run docs:gen`)', () => {
    expect(blockInner('PACKAGES', ARCHITECTURE)).toBe(renderPackagesBlock());
  });
  it('the EXAMPLES block matches a regenerate (run `pnpm run docs:gen`)', () => {
    expect(blockInner('EXAMPLES')).toBe(renderExamplesBlock());
  });
  it('the BENCH block matches a regenerate from benchmarks/readme-snapshot.json', () => {
    expect(blockInner('BENCH')).toBe(renderBenchBlock());
  });
  it('the WIRE-CONTRACT block (in packages/web/README.md) matches a regenerate (run `pnpm run docs:gen`)', () => {
    expect(blockInner('WIRE-CONTRACT', WEB_README)).toBe(renderWireContractDoc());
  });
  it('projects the complete command catalog into the CLI README', () => {
    expect(blockInner('CLI-COMMAND-CATALOG', CLI_README)).toBe(renderCliCommandCatalog());
  });
  it('projects check-profile claims and membership into the CLI README', () => {
    expect(blockInner('CHECK-PROFILES', CLI_README)).toBe(renderCheckProfiles());
  });
  it('projects MCP tools from the catalog exposure annotation', () => {
    expect(blockInner('MCP-TOOL-CATALOG', MCP_README)).toBe(renderMcpToolCatalog());
  });
});

describe('doc-registry — every publishable package is accounted for', () => {
  const publishable = loadPackageManifests().filter((p) => p.publishable);
  const groupMembers = PACKAGE_GROUPS.flatMap((g) => g.members);
  const grouped = new Set(groupMembers);

  it('lands in exactly one README package group or the prose-only allowlist', () => {
    for (const pkg of publishable) {
      // Count occurrences (not membership) so a package duplicated across two
      // groups — which would print twice in the README — fails here too.
      const groupCount = groupMembers.filter((m) => m === pkg.name).length;
      const proseCount = (PROSE_ONLY as readonly string[]).includes(pkg.name) ? 1 : 0;
      expect(
        groupCount + proseCount,
        `${pkg.name} must appear EXACTLY once across package groups + PROSE_ONLY (found ${groupCount + proseCount})`,
      ).toBe(1);
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
    (p) => p.publishable && p.name.startsWith('@liteship/') && !noSection.has(p.name),
  );

  it('has a section for every @liteship import-surface package (except documented type-only spines)', () => {
    for (const pkg of importSurfaces) {
      expect(surfaces.includes(`## \`${pkg.name}\``), `PACKAGE-SURFACES.md is missing a section for ${pkg.name}`).toBe(
        true,
      );
    }
  });
});

describe('doc-registry — example README version-pin advice tracks the release line', () => {
  // The 0.8.0 audit found the ladder saying `^0.7.0` while five child READMEs said
  // `^0.4.0` — every install instruction a copying user read was wrong, and they
  // disagreed with each other. Source of truth is the workspace version: any
  // "pin `@liteship/*` … at `^X.Y.Z`" sentence in an example README must carry the
  // workspace major.minor.
  const workspace = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as { version: string };
  const [major, minor] = workspace.version.split('.');
  const pinPattern = /pin `@liteship\/\*`[^`]*`\^(\d+)\.(\d+)\.(\d+)`/g;

  it('every example README pin matches the workspace major.minor', () => {
    const readmes = [
      'examples/README.md',
      ...['default', 'tutorial', 'showcase', 'cloudflare-astro', 'remotion-demo', '03-cast-aria', '05-ai-patch-refused', '06-mutation-roundtrip'].map(
        (d) => `examples/${d}/README.md`,
      ),
    ].filter((p) => existsSync(resolve(REPO_ROOT, p)));

    let pinsSeen = 0;
    for (const rel of readmes) {
      const text = readFileSync(resolve(REPO_ROOT, rel), 'utf8');
      for (const m of text.matchAll(pinPattern)) {
        pinsSeen += 1;
        expect(
          `${m[1]}.${m[2]}`,
          `${rel} advises pinning @liteship/* at ^${m[1]}.${m[2]}.${m[3]}, but the workspace release line is ${workspace.version} — update the sentence`,
        ).toBe(`${major}.${minor}`);
      }
    }
    // The guard must never green by matching nothing: the pin sentences exist today.
    expect(pinsSeen).toBeGreaterThanOrEqual(6);
  });
});

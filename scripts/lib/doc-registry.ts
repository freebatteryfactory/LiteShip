/**
 * Single source of truth for the generated package/examples registry blocks in
 * README.md. Package one-liners come from each `package.json` `description`
 * (edit them there); this module owns only the GROUP STRUCTURE + order + intros.
 *
 * Rendered into README between `<!-- BEGIN PACKAGES -->`/`<!-- END PACKAGES -->`
 * (and the examples block) by `scripts/gen-docs.ts`. A drift test
 * (`tests/unit/devops/doc-registry.test.ts`) fails if the committed block stops
 * matching, and if any publishable package is missing from the registry — so a
 * new package can't silently fall out of the docs.
 *
 * @module
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

export interface PackageManifest {
  readonly name: string;
  readonly dir: string;
  readonly description: string;
  readonly publishable: boolean;
}

/** Read every `packages/*` manifest (name, dir, description, publishable). */
export function loadPackageManifests(): readonly PackageManifest[] {
  const out: PackageManifest[] = [];
  for (const dir of readdirSync(resolve(REPO_ROOT, 'packages'))) {
    let raw: string;
    try {
      raw = readFileSync(resolve(REPO_ROOT, 'packages', dir, 'package.json'), 'utf8');
    } catch {
      continue;
    }
    const pkg = JSON.parse(raw) as { name?: string; description?: string; publishConfig?: unknown };
    if (!pkg.name) continue;
    out.push({
      name: pkg.name,
      dir,
      description: pkg.description ?? '',
      publishable: pkg.publishConfig != null,
    });
  }
  return out;
}

/** Read every `examples/*` workspace that is a real package (has package.json). */
export function loadExampleManifests(): readonly { name: string; dir: string; description: string }[] {
  const out: { name: string; dir: string; description: string }[] = [];
  for (const dir of readdirSync(resolve(REPO_ROOT, 'examples'))) {
    let raw: string;
    try {
      raw = readFileSync(resolve(REPO_ROOT, 'examples', dir, 'package.json'), 'utf8');
    } catch {
      continue; // fixture dir (e.g. examples/scenes) with no package.json
    }
    const pkg = JSON.parse(raw) as { name?: string; description?: string };
    out.push({ name: pkg.name ?? dir, dir, description: pkg.description ?? '' });
  }
  return out;
}

/** An ordered group of packages in the README "What's in the box" registry. */
interface PackageGroup {
  /** Sentence printed above the table; `null` for the first group (it follows prose). */
  readonly intro: string | null;
  readonly members: readonly string[];
}

/**
 * The four README package tables, in order. Membership is curated here; the
 * one-liner for each comes from its package.json description. Adding a package
 * means adding its name to a group below (or PROSE_ONLY) — the drift test
 * enforces that every publishable package lands somewhere.
 */
export const PACKAGE_GROUPS: readonly PackageGroup[] = [
  {
    intro: null,
    members: ['@czap/core', '@czap/canonical', '@czap/error', '@czap/genui', '@czap/quantizer', '@czap/compiler'],
  },
  {
    intro: 'Add a host integration when you wire LiteShip into a build pipeline:',
    members: ['@czap/vite', '@czap/astro', '@czap/edge', '@czap/cloudflare'],
  },
  {
    intro: 'Reach for the rest only when the surface meaning justifies the runtime escalation:',
    members: [
      '@czap/web',
      '@czap/detect',
      '@czap/worker',
      '@czap/remotion',
      '@czap/scene',
      '@czap/assets',
      '@czap/stage',
      '@czap/cli',
      '@czap/mcp-server',
      '@czap/_spine',
    ],
  },
  {
    intro: "You don't install these directly — they back the CLI, the MCP server, and the release tooling:",
    members: ['@czap/command', '@czap/audit', '@czap/gauntlet'],
  },
];

/**
 * Publishable packages intentionally NOT in the README package tables: the
 * umbrella meta-package and the scaffold, which are named in prose
 * (`npm create liteship`) rather than imported.
 */
export const PROSE_ONLY = ['liteship', 'create-liteship'] as const;

/**
 * Publishable packages with no PACKAGE-SURFACES.md section, by design.
 * `@czap/_spine` is a type-only declaration spine — you never import from it,
 * so it has no public import surface to map.
 */
export const NO_SURFACE_SECTION = ['@czap/_spine'] as const;

function tableFor(members: readonly string[], byName: Map<string, PackageManifest>): string {
  const rows = members.map((name) => {
    const pkg = byName.get(name);
    if (!pkg) throw new Error(`doc-registry: package group lists unknown package "${name}"`);
    return `| [\`${name}\`](./packages/${pkg.dir}) | ${pkg.description} |`;
  });
  return ['| Package | Description |', '| --- | --- |', ...rows].join('\n');
}

/** Render the README package registry block (the four tables + intros). */
export function renderPackagesBlock(): string {
  const byName = new Map(loadPackageManifests().map((p) => [p.name, p]));
  const sections = PACKAGE_GROUPS.map((g) => {
    const table = tableFor(g.members, byName);
    return g.intro == null ? table : `${g.intro}\n\n${table}`;
  });
  return sections.join('\n\n');
}

/** Render the README examples table block (from each examples workspace manifest). */
export function renderExamplesBlock(): string {
  const byDir = new Map(loadExampleManifests().map((e) => [e.dir, e]));
  // Curated order + what-it-shows blurbs (examples have no rich package.json description).
  const rows: readonly { dir: string; shows: string }[] = [
    { dir: 'tutorial', shows: 'The guided five-step intro: boundary → `satelliteAttrs` → tokens → themes → streaming' },
    { dir: 'showcase', shows: 'The cast family in one app — CSS/GPU boundaries, workers, streaming + generative-UI' },
    {
      dir: '05-ai-patch-refused',
      shows: 'The AI-safety seam made visible — an invalid model `GraphPatch` is refused; only a validated proposal changes the graph',
    },
    { dir: 'default', shows: 'The minimal `npm create liteship` starter' },
    { dir: 'cloudflare-astro', shows: 'Edge KV boundary cache + Astro middleware on Cloudflare' },
    { dir: 'remotion-demo', shows: 'Headless video export from the same DocumentGraph (standalone: `cd examples/remotion-demo && pnpm install`)' },
  ];
  for (const r of rows) {
    if (!byDir.has(r.dir)) throw new Error(`doc-registry: examples table lists missing workspace "examples/${r.dir}"`);
  }
  const body = rows.map((r) => `| [\`${r.dir}\`](./examples/${r.dir}) | ${r.shows} |`);
  return ['| Example | What it shows |', '|---|---|', ...body].join('\n');
}

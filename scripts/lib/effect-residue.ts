/**
 * Full-scope `effect` residue scan — the Effect-shed's self-proving exit criterion.
 *
 * The shed (issue #153, receipt: traceability/effect-shed-receipt.json) removed the
 * `effect` library from the ecosystem. Two partial guards survived it: Invariant 14
 * (static `from 'effect'` imports under non-underscore `packages/*\/src`) and the
 * shipped-docs sweep. This engine closes the gap that issue #180 names: a dependency
 * reintroduced via scaffolder TEMPLATE, EXAMPLE app, MANIFEST key, dynamic import,
 * or a vendored `Effect.<method>(` call site would slip both.
 *
 * Scope: every package tree in full (INCLUDING `_`-prefixed packages and the
 * CLI-shipped fragments/), examples (source, not build output), scripts, tests,
 * and EVERY authored manifest in the repository, recursively. Comment lines are
 * exempt — residue means something the runtime executes or the installer
 * resolves, not prose about the shed (the `_spine` "was Effect.Effect<...>"
 * history lines stay legal).
 *
 * The consuming test (tests/unit/devops/effect-residue-scan.test.ts) holds the
 * pinned allowlist (files that carry these patterns as regex/fixture literals) and
 * the negative controls proving every kind fires.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export type EffectResidueKind = 'static-import' | 'dynamic-import' | 'require' | 'call-site' | 'manifest-dependency';

export interface EffectResidueFinding {
  /** Repo-relative POSIX path. */
  readonly file: string;
  /** 1-based line for file findings; 0 for manifest-key findings. */
  readonly line: number;
  readonly kind: EffectResidueKind;
  readonly detail: string;
}

export interface EffectResidueScan {
  readonly findings: readonly EffectResidueFinding[];
  /** Every repo-relative file the sweep actually read (anti-vacuity inventory). */
  readonly swept: readonly string[];
}

// `from 'effect'` (static/re-export) OR bare `import 'effect'` — a side-effect
// import executes the module without any `from`, so requiring `from` alone was
// a false-green path (PR #186 review, confirmed).
const STATIC_IMPORT = /\b(?:from|import)\s+['"]effect(?:\/[^'"]*)?['"]/;
// `,?` — a multiline call collapsed to one line carries prettier's trailing
// comma (`import('effect',)`), which must not defeat the match.
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]effect(?:\/[^'"]*)?['"]\s*,?\s*\)/;
const REQUIRE_CALL = /\brequire\s*\(\s*['"]effect(?:\/[^'"]*)?['"]\s*,?\s*\)/;
// ANY `Effect.<method>(` call: the shed removed the library, so no legitimate
// `Effect.` namespace call exists outside the pinned allowlist — enumerating
// blessed method names just left every unlisted method a false green.
const CALL_SITE = /\bEffect\.[A-Za-z_$][\w$]*\s*\(/;

const MANIFEST_DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.astro'];
const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.astro', 'coverage']);

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Classify one SOURCE line. Pure; comment lines never classify (prose about the
 * shed is history, not residue).
 */
export function classifyEffectResidueLine(line: string): readonly EffectResidueKind[] {
  if (isCommentLine(line)) return [];
  const kinds: EffectResidueKind[] = [];
  if (STATIC_IMPORT.test(line)) kinds.push('static-import');
  if (DYNAMIC_IMPORT.test(line)) kinds.push('dynamic-import');
  if (REQUIRE_CALL.test(line)) kinds.push('require');
  if (CALL_SITE.test(line)) kinds.push('call-site');
  return kinds;
}

/**
 * Classify one parsed manifest. Flags `effect` and `@effect/*` in every dependency
 * field plus pnpm overrides (the resolution-forcing side door).
 */
export function classifyEffectResidueManifest(manifest: Record<string, unknown>): readonly string[] {
  const details: string[] = [];
  const flag = (field: string, deps: unknown): void => {
    if (typeof deps !== 'object' || deps === null) return;
    for (const [name, spec] of Object.entries(deps)) {
      if (name === 'effect' || name.startsWith('@effect/')) {
        details.push(`${field}.${name}`);
        continue;
      }
      // npm ALIASES are the side door the key check cannot see (PR #191 review,
      // confirmed): `"fx": "npm:effect@^3"` installs the library under a name
      // no import/call scanner matches. The VALUE names the real package.
      if (typeof spec === 'string' && /^npm:(?:effect(?:@|$)|@effect\/)/.test(spec)) {
        details.push(`${field}.${name} -> ${spec}`);
      }
    }
  };
  for (const field of MANIFEST_DEP_FIELDS) flag(field, manifest[field]);
  const pnpm = manifest['pnpm'] as Record<string, unknown> | undefined;
  if (pnpm !== undefined) {
    flag('pnpm.overrides', pnpm['overrides']);
    flag('pnpm.catalog', pnpm['catalog']);
  }
  return details;
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function walkSources(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) walkSources(join(dir, entry.name), out);
      continue;
    }
    if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) out.push(join(dir, entry.name));
  }
}

// EVERY authored manifest in the repository, recursively — a shallow
// hand-enrolled list silently missed the CLI-shipped fragments and the vite
// integration workspace member (PR #186 review, confirmed). A new template,
// fragment, or fixture manifest joins the scan the moment it exists.
function manifestPaths(root: string): string[] {
  const paths: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name) && entry.name !== '.git') walk(join(dir, entry.name));
      } else if (entry.name === 'package.json') {
        paths.push(join(dir, entry.name));
      }
    }
  };
  walk(root);
  return paths;
}

/** Sweep the full residue scope from the repo root. */
export function scanEffectResidue(root: string, allowlist: ReadonlySet<string>): EffectResidueScan {
  const sourceRoots: string[] = [];
  const packagesDir = join(root, 'packages');
  // The WHOLE package directory, not just src + templates: the CLI ships its
  // fragments/ tree verbatim into user projects (PR #186 review, confirmed),
  // and any future shipped subtree joins the sweep the moment it exists.
  for (const name of readdirSync(packagesDir, { withFileTypes: true })) {
    if (name.isDirectory()) sourceRoots.push(join(packagesDir, name.name));
  }
  for (const top of ['examples', 'scripts', 'tests']) {
    const dir = join(root, top);
    if (existsSync(dir)) sourceRoots.push(dir);
  }

  const files: string[] = [];
  for (const sourceRoot of sourceRoots) walkSources(sourceRoot, files);

  const findings: EffectResidueFinding[] = [];
  const swept: string[] = [];
  for (const absolute of files.sort()) {
    const file = toPosix(relative(root, absolute));
    if (allowlist.has(file)) continue;
    swept.push(file);
    const lines = readFileSync(absolute, 'utf8').split(/\r?\n/);
    let found = false;
    for (let index = 0; index < lines.length; index += 1) {
      for (const kind of classifyEffectResidueLine(lines[index]!)) {
        findings.push({ file, line: index + 1, kind, detail: lines[index]!.trim().slice(0, 120) });
        found = true;
      }
    }
    // Second pass — the same classifiers over a comment-stripped, whitespace-
    // collapsed rendition, so a construct formatted across line boundaries
    // (`import(\n  'effect'\n)`) cannot evade the per-line pass (PR #186
    // review, confirmed). Only when the per-line pass saw nothing: any single
    // finding already reds the zero-findings law, so per-file dedup is sound.
    if (!found) {
      const collapsed = lines
        .filter((line) => !isCommentLine(line))
        .join(' ')
        .replace(/\s+/g, ' ');
      for (const kind of classifyEffectResidueLine(collapsed)) {
        findings.push({ file, line: 0, kind, detail: 'construct spans line boundaries (collapsed-source match)' });
      }
    }
  }

  for (const manifestPath of manifestPaths(root)) {
    const file = toPosix(relative(root, manifestPath));
    swept.push(file);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    for (const detail of classifyEffectResidueManifest(manifest)) {
      findings.push({ file, line: 0, kind: 'manifest-dependency', detail });
    }
  }

  return { findings, swept };
}

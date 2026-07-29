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
 * Scope: every package src tree (INCLUDING `_`-prefixed), scaffolder templates,
 * examples (source, not build output), scripts, tests, and every workspace-reachable
 * manifest's dependency keys. Comment lines are exempt — residue means something the
 * runtime executes or the installer resolves, not prose about the shed (the `_spine`
 * "was Effect.Effect<...>" history lines stay legal).
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

const STATIC_IMPORT = /\bfrom\s+['"]effect(?:\/[^'"]*)?['"]/;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]effect(?:\/[^'"]*)?['"]\s*\)/;
const REQUIRE_CALL = /\brequire\s*\(\s*['"]effect(?:\/[^'"]*)?['"]\s*\)/;
const CALL_SITE =
  /\bEffect\.(?:runSync|runPromise|runFork|gen|scoped|all|succeed|fail|die|promise|sync|try|tryPromise|forEach|flatMap|map|provide|provideService|acquireRelease)\s*\(/;

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
    for (const name of Object.keys(deps)) {
      if (name === 'effect' || name.startsWith('@effect/')) details.push(`${field}.${name}`);
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

function manifestPaths(root: string): string[] {
  const paths: string[] = [join(root, 'package.json')];
  for (const group of ['packages', 'examples']) {
    const groupDir = join(root, group);
    if (!existsSync(groupDir)) continue;
    for (const name of readdirSync(groupDir)) {
      const manifest = join(groupDir, name, 'package.json');
      if (existsSync(manifest)) paths.push(manifest);
    }
  }
  const templatesDir = join(root, 'packages', 'create-liteship', 'templates');
  if (existsSync(templatesDir)) {
    for (const name of readdirSync(templatesDir)) {
      const manifest = join(templatesDir, name, 'package.json');
      if (existsSync(manifest)) paths.push(manifest);
    }
  }
  const integrationManifest = join(root, 'tests', 'integration', 'astro', 'package.json');
  if (existsSync(integrationManifest)) paths.push(integrationManifest);
  return paths;
}

/** Sweep the full residue scope from the repo root. */
export function scanEffectResidue(root: string, allowlist: ReadonlySet<string>): EffectResidueScan {
  const sourceRoots: string[] = [];
  const packagesDir = join(root, 'packages');
  for (const name of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    for (const subtree of ['src', 'templates']) {
      const dir = join(packagesDir, name.name, subtree);
      if (existsSync(dir) && statSync(dir).isDirectory()) sourceRoots.push(dir);
    }
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
    for (let index = 0; index < lines.length; index += 1) {
      for (const kind of classifyEffectResidueLine(lines[index]!)) {
        findings.push({ file, line: index + 1, kind, detail: lines[index]!.trim().slice(0, 120) });
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

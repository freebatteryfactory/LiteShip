/**
 * Repo-truths single ownership — one truth, one owner, zero private parsers.
 *
 * Scar S0.4 (docs/plan/scar-ledger.md): two drift-guards independently
 * regex-parsed the build script; fixing one left the other broken. Related:
 * scaffold caret-floor and ship pack tests string-parsed manifest shapes that
 * `catalog:` changed under them. Class: *one truth, many private parsers —
 * forked invariants drift independently.*
 *
 * This module is the SINGLE owner of the canonical repo facts every drift guard
 * asserts against. Each accessor reads its ONE source of truth:
 *
 *   - `rootManifest()` / `workspaceVersion()` ....... root `package.json`
 *   - `packageManifests()` / `workspaceManifests()` . `packages/*` (+ `examples/*`) `package.json`
 *   - `publishablePackageDirs()` .................... `packages/<dir>/package.json` `publishConfig`
 *   - `packageRoster()` ............................. the canonical `@liteship/*` fleet
 *   - `rootTsconfigReferenceDirs()` ................. root `tsconfig.json` `references`
 *   - `catalogEntry()` .............................. `pnpm-workspace.yaml` `catalog:`
 *
 * Drift guards import these accessors instead of re-parsing the sources. The
 * ast-grep rule `sgrules/repo-truths-no-script-parse.yml` forbids the S0.4
 * signature (regex-parsing a package.json script BODY) inside `tests/`,
 * allowlisting this file — so a re-inlined private parse fails `lint:structural`.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The monorepo root — this file lives at `tests/support/`, so up two. */
const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

// ---------------------------------------------------------------------------
// Root package.json — single owner.
// ---------------------------------------------------------------------------

/** The subset of the root manifest the drift guards read. */
export interface RootManifest {
  readonly version: string;
  readonly scripts: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly pnpm?: { readonly overrides?: Readonly<Record<string, string>> };
}

/** Parse the root `package.json` — the ONLY reader of it in the test tree. */
export function rootManifest(): RootManifest {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as RootManifest;
}

/** The workspace release version (root `package.json` `version`). */
export function workspaceVersion(): string {
  return rootManifest().version;
}

// ---------------------------------------------------------------------------
// Workspace package manifests — single owner of the packages/ + examples/ scan.
// ---------------------------------------------------------------------------

/** Which workspace group a manifest belongs to. */
export type WorkspaceGroup = 'packages' | 'examples';

/** A parsed workspace manifest with the fields the drift guards assert against. */
export interface WorkspaceManifest {
  /** The group the manifest lives under (`packages` or `examples`). */
  readonly group: WorkspaceGroup;
  /** The directory basename (e.g. `core`, `_spine`). */
  readonly dir: string;
  /** Repo-relative manifest path, forward-slashed (e.g. `packages/core/package.json`). */
  readonly relPath: string;
  readonly name?: string;
  readonly private?: boolean;
  readonly version?: string;
  readonly publishConfig?: { readonly access?: string } & Readonly<Record<string, unknown>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

interface RawManifest {
  readonly name?: string;
  readonly private?: boolean;
  readonly version?: string;
  readonly publishConfig?: { readonly access?: string } & Readonly<Record<string, unknown>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

function readGroupManifests(group: WorkspaceGroup): WorkspaceManifest[] {
  const groupDir = resolve(REPO_ROOT, group);
  if (!existsSync(groupDir)) return [];
  const manifests: WorkspaceManifest[] = [];
  for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relPath = `${group}/${entry.name}/package.json`;
    const abs = join(groupDir, entry.name, 'package.json');
    if (!existsSync(abs)) continue; // a directory without a manifest is not a package
    let raw: RawManifest;
    try {
      raw = JSON.parse(readFileSync(abs, 'utf8')) as RawManifest;
    } catch {
      continue; // unparseable manifest → not a package
    }
    manifests.push({ group, dir: entry.name, relPath, ...raw });
  }
  return manifests.sort((a, b) => a.dir.localeCompare(b.dir));
}

/** Every `packages/*` and `examples/*` manifest — the single parser. */
export function workspaceManifests(): readonly WorkspaceManifest[] {
  return [...readGroupManifests('packages'), ...readGroupManifests('examples')];
}

/** Every `packages/*` manifest (excludes `examples/*`). */
export function packageManifests(): readonly WorkspaceManifest[] {
  return readGroupManifests('packages');
}

// ---------------------------------------------------------------------------
// Publishable set + roster.
// ---------------------------------------------------------------------------

/**
 * The `packages/*` directory basenames whose manifest carries a `publishConfig`
 * (and a name) — the build/publish set. Sorted for determinism. Build-topology
 * exclusions (e.g. the type-only `_spine`, which carries a publishConfig but
 * does not compile) are applied by the consuming guard.
 */
export function publishablePackageDirs(): readonly string[] {
  return packageManifests()
    .filter((m) => m.publishConfig != null && m.name != null)
    .map((m) => m.dir)
    .sort();
}

/**
 * The independent physical-packaging oracle: every non-private
 * `@liteship/*` manifest on disk, sorted. Authored membership and dependency
 * order live in `scripts/package-catalog.ts`; generator and roster tests compare
 * that catalog with this disk-derived view so neither source can bless itself.
 */
export function packageRoster(): readonly string[] {
  return packageManifests()
    .filter((m) => m.private !== true && m.name != null && m.name.startsWith('@liteship/'))
    .map((m) => m.name as string)
    .sort();
}

// ---------------------------------------------------------------------------
// Root tsconfig references topology — single owner.
// ---------------------------------------------------------------------------

interface RootTsconfig {
  readonly references?: ReadonlyArray<{ readonly path: string }>;
}

/**
 * The `./packages/<dir>` references declared in the root `tsconfig.json` —
 * the build topology (`build` is a bare `tsc --build`). Only `./packages/<dir>`
 * references are counted; nested or external paths are ignored.
 */
export function rootTsconfigReferenceDirs(): readonly string[] {
  const tsconfig = JSON.parse(readFileSync(resolve(REPO_ROOT, 'tsconfig.json'), 'utf8')) as RootTsconfig;
  return (tsconfig.references ?? [])
    .map((reference) => /^\.\/packages\/([\w-]+)$/.exec(reference.path)?.[1])
    .filter((dir): dir is string => dir != null);
}

// ---------------------------------------------------------------------------
// pnpm catalog — single owner.
// ---------------------------------------------------------------------------

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The value of a `catalog:` entry in `pnpm-workspace.yaml`, quotes stripped, or
 * `undefined` if absent. Scoped to the `catalog:` block so a same-named key
 * elsewhere in the file cannot be mistaken for a catalog entry.
 */
export function catalogEntry(name: string): string | undefined {
  const yaml = readFileSync(resolve(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => /^catalog:\s*(#.*)?$/.test(line));
  if (start === -1) return undefined;
  const entry = new RegExp(`^\\s+${escapeRegExp(name)}:\\s*(.+?)\\s*$`);
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\S/.test(line)) break; // dedent to a top-level key ends the catalog block
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const match = entry.exec(line);
    if (match) return match[1]!.replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Gate-script derivations — the S0.4-owned truths.
// ---------------------------------------------------------------------------
//
// The root `lint` / `typecheck` scripts encode build topology in their argv:
// eslint's target globs, and the `&&`-chained tsc legs. Extracting that topology
// is exactly the "regex-parse a package.json SCRIPT BODY" move scar S0.4 forbids
// everywhere else (`sgrules/repo-truths-no-script-parse.yml`). This module — the
// rule's sole allowlisted file — is that parse's ONE sanctioned home, so a drift
// guard reads the derived list here instead of re-forking the parse.

/**
 * The quoted glob arguments of the root `lint` script — eslint's target set
 * (e.g. `packages/*​/src/**​/*.ts`). Only quoted tokens containing a `*` are
 * returned, so a non-glob quoted flag value cannot inflate the list.
 */
export function lintGlobs(): readonly string[] {
  const lint = rootManifest().scripts.lint ?? '';
  return [...lint.matchAll(/"([^"]+)"/g)].map((match) => match[1]!).filter((glob) => glob.includes('*'));
}

/**
 * The `&&`-chained legs of the root `typecheck` script, each trimmed. Leg 0 is
 * the build-mode `tsc --build` the S0.3 vacuity tripwire pins.
 */
export function typecheckLegs(): readonly string[] {
  return (rootManifest().scripts.typecheck ?? '').split('&&').map((leg) => leg.trim());
}

/** The raw root `typecheck` script body (for whole-script `.toMatch` assertions). */
export function typecheckScript(): string {
  return rootManifest().scripts.typecheck ?? '';
}

// ---------------------------------------------------------------------------
// Build config inputs — per-package tsconfig, tests project, api surface.
// ---------------------------------------------------------------------------

/** Tolerant JSONC reader: strips block + line comments before JSON.parse. */
function readJsonc<T>(absPath: string): T {
  const text = readFileSync(absPath, 'utf8');
  try {
    return JSON.parse(text) as T;
  } catch {
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    return JSON.parse(stripped) as T;
  }
}

/** The `include` + `files` compile inputs of a tsconfig. */
export interface TsconfigInputs {
  readonly include?: ReadonlyArray<string>;
  readonly files?: ReadonlyArray<string>;
}

/**
 * The `include` + `files` inputs of `packages/<dir>/tsconfig.json` (JSONC-
 * tolerant), or `undefined` if that project has no tsconfig (a dangling
 * reference). Feeds the build-topology floor that proves every root reference
 * compiles real files.
 */
export function packageTsconfigInputs(dir: string): TsconfigInputs | undefined {
  const abs = resolve(REPO_ROOT, 'packages', dir, 'tsconfig.json');
  if (!existsSync(abs)) return undefined;
  const cfg = readJsonc<TsconfigInputs>(abs);
  return { include: cfg.include, files: cfg.files };
}

/** The concrete (non-glob) `include` entries of `tsconfig.tests.json` (JSONC-tolerant). */
export function tsconfigTestsIncludeFiles(): readonly string[] {
  const include = readJsonc<TsconfigInputs>(resolve(REPO_ROOT, 'tsconfig.tests.json')).include ?? [];
  return include.filter((entry) => !entry.includes('*'));
}

/** The parsed api-surface snapshot fixture (plain JSON). */
export interface ApiSurfaceSnapshot {
  readonly packages: Readonly<Record<string, { readonly exports?: ReadonlyArray<unknown> }>>;
}

/** Read the checked-in api-surface snapshot — the single reader in the test tree. */
export function apiSurfaceSnapshot(): ApiSurfaceSnapshot {
  return JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'tests', 'fixtures', 'api-surface-snapshot.json'), 'utf8'),
  ) as ApiSurfaceSnapshot;
}

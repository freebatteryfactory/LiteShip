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
 *   - `packageRoster()` ............................. the canonical `@czap/*` fleet
 *   - `rootTsconfigReferenceDirs()` ................. root `tsconfig.json` `references`
 *   - `catalogEntry()` / `effectCatalogRange()` ..... `pnpm-workspace.yaml` `catalog:`
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
 * The canonical dependency-fleet roster: every non-private `@czap/*` package on
 * disk, sorted.
 *
 * The plan (T148 / duplication workstream) designates `@czap/audit`'s exported
 * `CZAP_PACKAGE_ROSTER` as the eventual single roster anchor; it does not exist
 * yet (grep of `packages/` finds no such export as of this wave), so the roster
 * is DERIVED here from the publishable set. When audit ships the export, this
 * accessor should delegate to it and the derivation drops out.
 */
export function packageRoster(): readonly string[] {
  return packageManifests()
    .filter((m) => m.private !== true && m.name != null && m.name.startsWith('@czap/'))
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

/** The single sanctioned `effect` prerelease range from the pnpm catalog. */
export function effectCatalogRange(): string | undefined {
  return catalogEntry('effect');
}

/**
 * Build-time token and theme manifest derivation.
 *
 * Scans a project for token definition modules (`tokens.ts` /
 * `*.tokens.ts`) and theme definition modules (`themes.ts` /
 * `*.themes.ts`), then derives the exports behind `virtual:czap/tokens`,
 * `virtual:czap/tokens.css`, and `virtual:czap/themes`.
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Theme, Token } from '@czap/core';
import { Diagnostics } from '@czap/core';
import { TokenCSSCompiler } from '@czap/compiler';
import { findConventionFiles } from './resolve-fs.js';
import { tryImportNamed } from './resolve-utils.js';

const DIAGNOSTIC_SOURCE = 'czap/vite.token-manifest';

/** Directory names never descended into while scanning a project. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.astro', '.wrangler', '.cache', '.output']);

/** Serializable token entry exported from `virtual:czap/tokens`. */
export type TokenManifestEntry = Pick<
  Token.Shape,
  'id' | 'name' | 'category' | 'axes' | 'values' | 'fallback' | 'cssProperty'
> & {
  readonly _tag: 'TokenDef';
  readonly _version: 1;
};

/** Token export name → definition for `virtual:czap/tokens`. */
export type TokenManifest = Readonly<Record<string, TokenManifestEntry>>;

/** Serializable theme entry exported from `virtual:czap/themes`. */
export type ThemeManifestEntry = Pick<Theme.Shape, 'id' | 'name' | 'variants' | 'tokens' | 'meta'> & {
  readonly _tag: 'ThemeDef';
  readonly _version: 1;
};

/** Theme export name → definition for `virtual:czap/themes`. */
export type ThemeManifest = Readonly<Record<string, ThemeManifestEntry>>;

/** Options for {@link collectTokenManifest}. */
export interface CollectTokenManifestOptions {
  /**
   * Extra directory holding token definitions -- mirror of the plugin's
   * `dirs.token` override; scanned in addition to the project walk.
   */
  readonly tokenDir?: string;
}

/** Options for {@link collectThemeManifest}. */
export interface CollectThemeManifestOptions {
  /**
   * Extra directory holding theme definitions -- mirror of the plugin's
   * `dirs.theme` override; scanned in addition to the project walk.
   */
  readonly themeDir?: string;
}

interface ProjectScan {
  readonly tokenFiles: readonly string[];
  readonly themeFiles: readonly string[];
}

function isTokenModuleFile(fileName: string): boolean {
  return fileName === 'tokens.ts' || fileName.endsWith('.tokens.ts');
}

function isThemeModuleFile(fileName: string): boolean {
  return fileName === 'themes.ts' || fileName.endsWith('.themes.ts');
}

function scanProject(projectRoot: string): ProjectScan {
  const tokenFiles: string[] = [];
  const themeFiles: string[] = [];
  const stack: string[] = [projectRoot];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let realDir: string;
    try {
      realDir = fs.realpathSync(dir);
    } catch {
      realDir = path.resolve(dir);
    }
    if (visited.has(realDir)) continue;
    visited.add(realDir);
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      Diagnostics.warnOnce({
        source: DIAGNOSTIC_SOURCE,
        code: 'scan-readdir-failed',
        message: `Could not read "${dir}" while scanning for token/theme definitions; entries under it are skipped.`,
        cause: error,
      });
      continue;
    }
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          const stat = fs.statSync(entryPath);
          isDirectory = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          continue;
        }
      }
      if (isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(entryPath);
        continue;
      }
      if (!isFile) continue;
      if (isTokenModuleFile(entry.name)) {
        tokenFiles.push(entryPath);
      } else if (isThemeModuleFile(entry.name)) {
        themeFiles.push(entryPath);
      }
    }
  }

  tokenFiles.sort();
  themeFiles.sort();
  return { tokenFiles, themeFiles };
}

/**
 * Import every export tagged `expectedTag` from a definition module via
 * {@link tryImportNamed} with an mtime cache-bust query so dev-server edits
 * to the same file reload fresh exports.
 */
async function importTaggedExports<T>(
  modulePath: string,
  expectedTag: string,
  diagnosticNoun: string,
): Promise<ReadonlyMap<string, T>> {
  const found = new Map<string, T>();
  let exportNames: string[] = [];
  try {
    const mtime = fs.statSync(modulePath).mtimeMs;
    const imported = (await import(/* @vite-ignore */ `${pathToFileURL(modulePath).href}?mtime=${mtime}`)) as Record<
      string,
      unknown
    >;
    exportNames = Object.keys(imported);
  } catch (error) {
    Diagnostics.warn({
      source: DIAGNOSTIC_SOURCE,
      code: 'import-failed',
      message: `Failed to import ${diagnosticNoun} module "${modulePath}"; its exports are missing from the manifest.`,
      cause: error,
    });
    return found;
  }

  const mtime = fs.statSync(modulePath).mtimeMs;
  for (const exportName of exportNames) {
    const value = await tryImportNamed<T>(modulePath, exportName, expectedTag, DIAGNOSTIC_SOURCE, diagnosticNoun, {
      cacheBustMtime: mtime,
    });
    if (value) found.set(exportName, value);
  }
  return found;
}

function mergeWithDuplicateWarnings<T extends { readonly id: string }>(
  target: Map<string, T>,
  incoming: ReadonlyMap<string, T>,
  kind: 'token' | 'theme',
): void {
  for (const [exportName, value] of incoming) {
    const existing = target.get(exportName);
    if (existing && existing.id !== value.id) {
      Diagnostics.warnOnce({
        source: DIAGNOSTIC_SOURCE,
        code: `duplicate-${kind}-name`,
        message:
          `Two ${kind} modules export "${exportName}" with different definitions ` +
          `(${existing.id} vs ${value.id}); the first one found wins in the manifest. ` +
          `Fix: rename one export so each ${kind} name is unique within the project.`,
      });
      continue;
    }
    target.set(exportName, value);
  }
}

function addConventionFiles(
  files: Set<string>,
  projectRoot: string,
  userDir: string | undefined,
  directName: string,
  suffix: string,
): void {
  if (!userDir) return;
  const dir = path.resolve(projectRoot, userDir);
  const direct = path.join(dir, directName);
  if (fs.existsSync(direct)) files.add(direct);
  for (const file of findConventionFiles(dir, suffix, DIAGNOSTIC_SOURCE)) {
    files.add(file);
  }
}

function serializeToken(token: Token.Shape): TokenManifestEntry {
  return {
    _tag: 'TokenDef',
    _version: 1,
    id: token.id,
    name: token.name,
    category: token.category,
    axes: token.axes,
    values: token.values,
    fallback: token.fallback,
    cssProperty: token.cssProperty,
  };
}

function serializeTheme(theme: Theme.Shape): ThemeManifestEntry {
  return {
    _tag: 'ThemeDef',
    _version: 1,
    id: theme.id,
    name: theme.name,
    variants: theme.variants,
    tokens: theme.tokens,
    meta: theme.meta,
  };
}

/**
 * Derive the token map for `virtual:czap/tokens` and `virtual:czap/tokens.css`.
 *
 * @param projectRoot - Absolute path of the project to scan.
 * @param options - Optional `tokenDir` override (mirror of `dirs.token`).
 */
export async function collectTokenManifest(
  projectRoot: string,
  options?: CollectTokenManifestOptions,
): Promise<TokenManifest> {
  const scan = scanProject(projectRoot);
  const tokenFiles = new Set<string>(scan.tokenFiles);
  addConventionFiles(tokenFiles, projectRoot, options?.tokenDir, 'tokens.ts', '.tokens.ts');

  const tokensByName = new Map<string, Token.Shape>();
  for (const file of tokenFiles) {
    mergeWithDuplicateWarnings(
      tokensByName,
      await importTaggedExports<Token.Shape>(file, 'TokenDef', 'token'),
      'token',
    );
  }

  const manifest: Record<string, TokenManifestEntry> = {};
  for (const [name, token] of tokensByName) {
    manifest[name] = serializeToken(token);
  }
  return manifest;
}

/**
 * Derive the theme map for `virtual:czap/themes`.
 *
 * @param projectRoot - Absolute path of the project to scan.
 * @param options - Optional `themeDir` override (mirror of `dirs.theme`).
 */
export async function collectThemeManifest(
  projectRoot: string,
  options?: CollectThemeManifestOptions,
): Promise<ThemeManifest> {
  const scan = scanProject(projectRoot);
  const themeFiles = new Set<string>(scan.themeFiles);
  addConventionFiles(themeFiles, projectRoot, options?.themeDir, 'themes.ts', '.themes.ts');

  const themesByName = new Map<string, Theme.Shape>();
  for (const file of themeFiles) {
    mergeWithDuplicateWarnings(
      themesByName,
      await importTaggedExports<Theme.Shape>(file, 'ThemeDef', 'theme'),
      'theme',
    );
  }

  const manifest: Record<string, ThemeManifestEntry> = {};
  for (const [name, theme] of themesByName) {
    manifest[name] = serializeTheme(theme);
  }
  return manifest;
}

/**
 * Compile all collected tokens into one CSS sheet: `@property` registrations
 * (when applicable) plus a single merged `:root { … }` block.
 */
export function compileCollectedTokensCss(tokens: TokenManifest): string {
  const tokenList = Object.values(tokens);
  if (tokenList.length === 0) return ':root {}';

  const registrationBlocks: string[] = [];
  const rootDecls: string[] = [];

  for (const token of tokenList) {
    const { customProperties } = TokenCSSCompiler.compile(token as Token.Shape);
    const rootIdx = customProperties.indexOf(':root {');
    if (rootIdx === -1) continue;

    const beforeRoot = customProperties.slice(0, rootIdx).trim();
    if (beforeRoot.length > 0) registrationBlocks.push(beforeRoot);

    const afterRootOpen = customProperties.slice(rootIdx + ':root {'.length);
    const closeIdx = afterRootOpen.lastIndexOf('}');
    const inner = afterRootOpen.slice(0, closeIdx).trim();
    if (inner.length > 0) rootDecls.push(inner);
  }

  const parts: string[] = [];
  if (registrationBlocks.length > 0) {
    parts.push(registrationBlocks.join('\n\n'));
  }
  parts.push(`:root {\n${rootDecls.join('\n')}\n}`);
  return parts.join('\n\n');
}

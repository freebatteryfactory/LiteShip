/**
 * api-index — resolve a symbol through real package export maps.
 *
 * A symbol is reportable only when it is reachable from a non-pattern, non-null
 * `package.json#exports` entry. The resolver follows declarations and relative
 * barrel re-exports from that public entrypoint; it never scans private source or
 * declaration files merely because they exist on disk.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import type { ApiSymbolResolution } from '@liteship/command';
import { PACKAGE_METADATA_CATALOG } from './package-metadata-catalog.js';

const DECLARATION_KINDS = 'const|let|var|function|class|interface|type|enum|namespace';

type ExportTarget = string | null | readonly ExportTarget[] | { readonly [condition: string]: ExportTarget };

interface OwnerManifest {
  readonly name: string;
  readonly exports?: ExportTarget;
}

interface IndexedPackage {
  readonly name: string;
  readonly packageDir: string;
  readonly mode: 'source' | 'installed';
}

interface PublicEntrypoint {
  readonly subpath: string;
  readonly file: string;
}

interface DeclarationMatch {
  readonly file: string;
  readonly kind: string;
  readonly summary: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstTsdocParagraph(block: string): string {
  const inner = block
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim());
  const paragraph: string[] = [];
  for (const line of inner) {
    if (line.startsWith('@')) break;
    if (line === '') {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(line);
  }
  return paragraph
    .join(' ')
    .replace(/\{@link\s+([^}]+)\}/g, (_match, target: string) => {
      const parts = target.trim().split(/[|\s]+/);
      return parts[parts.length - 1] ?? target.trim();
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function readManifest(packageDir: string): OwnerManifest | null {
  const manifestPath = join(packageDir, 'package.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Partial<OwnerManifest>;
  return typeof manifest.name === 'string' ? (manifest as OwnerManifest) : null;
}

function sourcePackages(repoRoot: string): readonly IndexedPackage[] {
  const packagesDir = join(repoRoot, 'packages');
  if (!existsSync(packagesDir)) return [];
  const result: IndexedPackage[] = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true }) as readonly Dirent[]) {
    if (!entry.isDirectory()) continue;
    const packageDir = join(packagesDir, entry.name);
    const manifest = readManifest(packageDir);
    if (manifest === null || PACKAGE_METADATA_CATALOG[manifest.name] === undefined) continue;
    result.push({ name: manifest.name, packageDir, mode: 'source' });
  }
  return result.sort((left, right) => left.name.localeCompare(right.name));
}

function nearestNodeModules(fromDir: string): string | null {
  let dir = resolve(fromDir);
  for (;;) {
    const candidate = join(dir, 'node_modules');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function installedPackageDir(nodeModules: string, packageName: string): string {
  return join(nodeModules, ...packageName.split('/'));
}

function installedPackages(fromDir: string): readonly IndexedPackage[] {
  const nodeModules = nearestNodeModules(fromDir);
  if (nodeModules === null) return [];
  const result: IndexedPackage[] = [];
  for (const name of Object.keys(PACKAGE_METADATA_CATALOG).sort()) {
    const packageDir = installedPackageDir(nodeModules, name);
    const manifest = readManifest(packageDir);
    if (manifest?.name !== name) continue;
    result.push({ name, packageDir, mode: 'installed' });
  }
  return result;
}

function selectTarget(target: ExportTarget, mode: IndexedPackage['mode']): string | null {
  if (typeof target === 'string') return target;
  if (target === null) return null;
  if (Array.isArray(target)) {
    for (const candidate of target) {
      const selected = selectTarget(candidate, mode);
      if (selected !== null) return selected;
    }
    return null;
  }
  const conditions = target as { readonly [condition: string]: ExportTarget };
  const preferred =
    mode === 'source'
      ? ['development', 'types', 'import', 'default', 'require']
      : ['types', 'import', 'default', 'require', 'development'];
  for (const condition of preferred) {
    if (!(condition in conditions)) continue;
    const selected = selectTarget(conditions[condition] as ExportTarget, mode);
    if (selected !== null) return selected;
  }
  for (const candidate of Object.values(conditions)) {
    const selected = selectTarget(candidate, mode);
    if (selected !== null) return selected;
  }
  return null;
}

function publicEntrypoints(pkg: IndexedPackage): readonly PublicEntrypoint[] {
  const manifest = readManifest(pkg.packageDir);
  if (manifest?.exports === undefined) return [];
  const exportsField = manifest.exports;
  const entries: readonly [string, ExportTarget][] =
    typeof exportsField === 'object' && exportsField !== null && !Array.isArray(exportsField)
      ? Object.keys(exportsField).some((key) => key.startsWith('.'))
        ? Object.entries(exportsField)
        : [['.', exportsField]]
      : [['.', exportsField]];
  const result: PublicEntrypoint[] = [];
  for (const [subpath, target] of entries) {
    if (subpath.includes('*') || target === null) continue;
    const selected = selectTarget(target, pkg.mode);
    if (selected === null) continue;
    const file = resolve(pkg.packageDir, selected);
    if (existsSync(file)) result.push({ subpath, file });
  }
  return result.sort((left, right) => left.subpath.localeCompare(right.subpath));
}

function declarationInFile(text: string, symbol: string, file: string): DeclarationMatch | null {
  const escaped = escapeRegExp(symbol);
  const commentBlock = String.raw`/\*\*(?:[^*]|\*(?!/))*\*/`;
  const withDoc = new RegExp(
    `(${commentBlock})\\s*export\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:async\\s+)?(${DECLARATION_KINDS})\\s+${escaped}\\b`,
  );
  const bare = new RegExp(
    `export\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:async\\s+)?(${DECLARATION_KINDS})\\s+${escaped}\\b`,
  );
  const documented = withDoc.exec(text);
  if (documented !== null) {
    return {
      file,
      kind: documented[2] as string,
      summary: firstTsdocParagraph(documented[1] as string),
    };
  }
  const match = bare.exec(text);
  return match === null ? null : { file, kind: match[1] as string, summary: '' };
}

function resolveRelativeModule(fromFile: string, specifier: string): string | null {
  const raw = resolve(dirname(fromFile), specifier);
  const extension = extname(raw);
  const stem = extension === '.js' || extension === '.mjs' || extension === '.cjs' ? raw.slice(0, -extension.length) : raw;
  const candidates = [
    raw,
    `${stem}.ts`,
    `${stem}.tsx`,
    `${stem}.mts`,
    `${stem}.cts`,
    `${stem}.d.ts`,
    join(stem, 'index.ts'),
    join(stem, 'index.d.ts'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function exportedName(specifier: string): { readonly imported: string; readonly exported: string } | null {
  const normalized = specifier.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/^type\s+/, '');
  if (normalized === '') return null;
  const parts = normalized.split(/\s+as\s+/);
  const imported = parts[0]?.trim();
  const exported = (parts[1] ?? parts[0])?.trim();
  return imported && exported ? { imported, exported } : null;
}

function findReachableDeclaration(
  file: string,
  symbol: string,
  visited: Set<string>,
): DeclarationMatch | null {
  const key = `${file}\0${symbol}`;
  if (visited.has(key)) return null;
  visited.add(key);
  const text = readFileSync(file, 'utf8');

  const direct = declarationInFile(text, symbol, file);
  if (direct !== null) return direct;

  const namedWithSource = /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(namedWithSource)) {
    const source = match[2] as string;
    for (const rawSpecifier of (match[1] as string).split(',')) {
      const names = exportedName(rawSpecifier);
      if (names?.exported !== symbol) continue;
      if (!source.startsWith('.')) return { file, kind: 're-export', summary: '' };
      const target = resolveRelativeModule(file, source);
      if (target === null) return null;
      return findReachableDeclaration(target, names.imported, visited) ?? { file, kind: 're-export', summary: '' };
    }
  }

  const localExports = /export\s+(?:type\s+)?\{([^}]+)\}(?!\s+from)/g;
  for (const match of text.matchAll(localExports)) {
    for (const rawSpecifier of (match[1] as string).split(',')) {
      const names = exportedName(rawSpecifier);
      if (names?.exported === symbol) return { file, kind: 're-export', summary: '' };
    }
  }

  const exportAll = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(exportAll)) {
    const source = match[1] as string;
    if (!source.startsWith('.')) continue;
    const target = resolveRelativeModule(file, source);
    if (target === null) continue;
    const found = findReachableDeclaration(target, symbol, visited);
    if (found !== null) return found;
  }
  return null;
}

function reportedFile(pkg: IndexedPackage, repoRoot: string, file: string): string {
  const base = pkg.mode === 'source' ? repoRoot : pkg.packageDir;
  return relative(base, file).split('\\').join('/');
}

/** Resolve an identifier only when a consumer can import it from a real export-map subpath. */
export function resolveApiSymbol(symbol: string, repoRoot: string): ApiSymbolResolution | null {
  if (!/^[A-Za-z_$][\w$]*$/.test(symbol)) return null;
  const packages = sourcePackages(repoRoot);
  const candidates = packages.length > 0 ? packages : installedPackages(repoRoot);
  for (const pkg of candidates) {
    for (const entrypoint of publicEntrypoints(pkg)) {
      const declaration = findReachableDeclaration(entrypoint.file, symbol, new Set());
      if (declaration === null) continue;
      return {
        symbol,
        package: pkg.name,
        subpath: entrypoint.subpath,
        file: reportedFile(pkg, repoRoot, declaration.file),
        kind: declaration.kind,
        summary: declaration.summary,
        packageDescription: PACKAGE_METADATA_CATALOG[pkg.name]?.description ?? '',
      };
    }
  }
  return null;
}

/** Build the injectable symbol resolver bound to a checkout or consumer-app root. */
export function buildApiSymbolResolver(repoRoot: string): (symbol: string) => ApiSymbolResolution | null {
  return (symbol: string) => resolveApiSymbol(symbol, repoRoot);
}

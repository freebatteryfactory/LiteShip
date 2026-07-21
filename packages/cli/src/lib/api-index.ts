/**
 * api-index — resolve an exported symbol to its owning package + source file +
 * one-paragraph TSDoc summary, the CLI-side capability the `explain` command's
 * SYMBOL arm reads through.
 *
 * This is the api-surface indexing logic (the same "enumerate the public
 * `@liteship/*` surface" idea the `tests/unit/meta/api-surface` machinery uses to
 * lock the value surface) lifted into a shippable, INJECTABLE resolver: instead of
 * importing every barrel at runtime, it scans `packages/*​/src` for the DECLARATION
 * of a symbol (an `export const|function|class|interface|type|enum NAME`), reads
 * the owning package name from that package's `package.json`, cross-references it
 * against {@link PACKAGE_METADATA_CATALOG} (so the owner is always a real
 * publishable scope), and lifts the declaration's leading TSDoc first paragraph as
 * the summary.
 *
 * The scan is DECLARATION-only (a re-export line has no TSDoc to lift and is not
 * the definition site), first-match-by-sorted-path so the result is deterministic.
 * `@liteship/cli` injects the built resolver as the `resolveApiSymbol` capability;
 * `@liteship/command` and the MCP server never take a build edge on this scan.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import type { ApiSymbolResolution } from '@liteship/command';
import { PACKAGE_METADATA_CATALOG } from './package-metadata-catalog.js';

/** The declaration kinds a symbol scan recognizes (the leading `export` keyword forms). */
const DECLARATION_KINDS = 'const|function|class|interface|type|enum';

/** Escape a symbol for safe embedding in a `RegExp`. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Recursively collect every `.ts` source file under a directory (skipping declaration files). */
function collectSourceFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return; // absent src tree — nothing to collect (no laundering catch)
  const entries: readonly Dirent[] = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
}

/**
 * Recursively collect every `.d.ts` DECLARATION file under a directory — the sibling
 * of {@link collectSourceFiles} (which SKIPS `.d.ts`) for the INSTALLED-package
 * fallback, where a published `dist` carries only emitted declarations + TSDoc.
 */
function collectDeclarationFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return; // absent dist tree — nothing to collect (no laundering catch)
  const entries: readonly Dirent[] = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectDeclarationFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
}

/** The owning package's manifest fields we read (name + description). */
interface OwnerManifest {
  readonly name: string;
}

/**
 * Read `packages/<dir>/package.json`'s `name`, or null when the manifest is absent
 * or nameless. A missing manifest is a normal "not a package dir" signal (guarded,
 * not caught); a malformed manifest is a genuine repo fault and is surfaced (the
 * `JSON.parse` throw propagates rather than being laundered into a silent null).
 */
function readPackageName(packageDir: string): string | null {
  const manifestPath = join(packageDir, 'package.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Partial<OwnerManifest>;
  return typeof manifest.name === 'string' ? manifest.name : null;
}

/**
 * Lift the FIRST PARAGRAPH of a leading TSDoc block into a plain sentence: strip
 * the `/**` / ` * ` decoration, stop at the first blank line or the first `@tag`,
 * flatten `{@link X}` to its display text, and collapse whitespace.
 */
function firstTsdocParagraph(block: string): string {
  const inner = block
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim());
  const paragraph: string[] = [];
  for (const line of inner) {
    if (line.startsWith('@')) break; // a block tag ends the summary
    if (line === '') {
      if (paragraph.length > 0) break; // first blank AFTER text ends the paragraph
      continue; // leading blank lines are skipped
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

/** One indexed package: its scope name + the absolute source root to scan. */
interface IndexedPackage {
  readonly name: string;
  readonly srcRoot: string;
}

/** Enumerate the publishable packages that have a scannable `src/` tree under `packages/`. */
function indexedPackages(repoRoot: string): readonly IndexedPackage[] {
  const packagesDir = join(repoRoot, 'packages');
  if (!existsSync(packagesDir)) return []; // not a repo checkout — nothing to index (guarded, not caught)
  const dirs: readonly Dirent[] = readdirSync(packagesDir, { withFileTypes: true });
  const result: IndexedPackage[] = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const packageDir = join(packagesDir, dir.name);
    const name = readPackageName(packageDir);
    // Only publishable scopes count as an "owning package" (the api-index is anchored
    // to PACKAGE_METADATA_CATALOG, the one publishable fleet).
    if (name === null || PACKAGE_METADATA_CATALOG[name] === undefined) continue;
    result.push({ name, srcRoot: join(packageDir, 'src') });
  }
  result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return result;
}

/**
 * Enumerate the INSTALLED publishable packages by walking up from `fromDir` to the
 * nearest `node_modules/@liteship` directory — the CONSUMER-APP layout, where there is
 * no `packages/*​/src` checkout to scan. Each subdir's `package.json` name is kept
 * only when it is a {@link PACKAGE_METADATA_CATALOG} key (a real publishable scope),
 * and its `srcRoot` is set to the package's built `dist` dir (the published `.d.ts`
 * live there). Sorted by scope name for determinism. Returns `[]` when no
 * `node_modules/@liteship` is found on the way up (guarded, not caught).
 */
function installedPackages(fromDir: string): readonly IndexedPackage[] {
  let dir = fromDir;
  // Bound the walk by the filesystem root (dirname(dir) === dir at the root); the
  // starting `fromDir` is checked first, so a consumer app's own node_modules wins.
  while (dirname(dir) !== dir) {
    const scopeDir = join(dir, 'node_modules', '@liteship');
    if (existsSync(scopeDir)) {
      const dirs: readonly Dirent[] = readdirSync(scopeDir, { withFileTypes: true });
      const result: IndexedPackage[] = [];
      for (const entry of dirs) {
        if (!entry.isDirectory()) continue;
        const packageDir = join(scopeDir, entry.name);
        const name = readPackageName(packageDir);
        // Only publishable scopes count (the fallback is anchored to the same catalog).
        if (name === null || PACKAGE_METADATA_CATALOG[name] === undefined) continue;
        result.push({ name, srcRoot: join(packageDir, 'dist') });
      }
      result.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      return result;
    }
    dir = dirname(dir);
  }
  return []; // no installed @liteship scope on the path up — nothing to fall back to
}

/**
 * Resolve one exported `symbol` to its declaration, or `null` when no scanned
 * publishable package declares it. Deterministic: packages are visited in sorted
 * scope order and files in sorted path order, so the first declaration wins stably.
 */
export function resolveApiSymbol(symbol: string, repoRoot: string): ApiSymbolResolution | null {
  if (!/^[A-Za-z_$][\w$]*$/.test(symbol)) return null; // not an identifier — never a symbol
  const escaped = escapeRegExp(symbol);
  // A SINGLE contiguous `/** … */` block (no `*/` inside), so the doc captured is
  // the one IMMEDIATELY preceding the export — not a span from an earlier comment.
  const commentBlock = String.raw`/\*\*(?:[^*]|\*(?!/))*\*/`;
  const withDoc = new RegExp(
    `(${commentBlock})\\s*export\\s+(?:declare\\s+)?(?:abstract\\s+)?(${DECLARATION_KINDS})\\s+${escaped}\\b`,
  );
  const bare = new RegExp(`export\\s+(?:declare\\s+)?(?:abstract\\s+)?(${DECLARATION_KINDS})\\s+${escaped}\\b`);

  /** Match the symbol's declaration in one file's text, lifting its kind + first-paragraph summary. */
  const matchDeclaration = (text: string): { readonly kind: string; readonly summary: string } | null => {
    const docMatch = withDoc.exec(text);
    const match = docMatch ?? bare.exec(text);
    if (match === null) return null;
    const kind = docMatch ? (docMatch[2] as string) : (match[1] as string);
    const summary = docMatch ? firstTsdocParagraph(docMatch[1] as string) : '';
    return { kind, summary };
  };

  // SOURCE SCAN FIRST — in a real monorepo checkout the `packages/*​/src` declaration
  // is the definition site and wins (its `file` is repo-relative).
  for (const pkg of indexedPackages(repoRoot)) {
    const files: string[] = [];
    collectSourceFiles(pkg.srcRoot, files);
    files.sort();
    for (const file of files) {
      // `files` came from a directory listing this same call produced; a read that
      // now fails is a genuine fault, surfaced rather than laundered into a skip.
      const decl = matchDeclaration(readFileSync(file, 'utf8'));
      if (decl === null) continue;
      return {
        symbol,
        package: pkg.name,
        subpath: '.',
        file: relative(repoRoot, file).split('\\').join('/'),
        kind: decl.kind,
        summary: decl.summary,
        packageDescription: PACKAGE_METADATA_CATALOG[pkg.name]?.description ?? '',
      };
    }
  }

  // INSTALLED FALLBACK — only when the source scan found nothing (a consumer app with
  // no checkout). Scan each installed package's published `.d.ts`; the same regex
  // matches `export declare const NAME`, and `file` is package-relative (`dist/…`).
  for (const pkg of installedPackages(repoRoot)) {
    const files: string[] = [];
    collectDeclarationFiles(pkg.srcRoot, files);
    files.sort();
    for (const file of files) {
      const decl = matchDeclaration(readFileSync(file, 'utf8'));
      if (decl === null) continue;
      return {
        symbol,
        package: pkg.name,
        subpath: '.',
        file: relative(dirname(pkg.srcRoot), file).split('\\').join('/'),
        kind: decl.kind,
        summary: decl.summary,
        packageDescription: PACKAGE_METADATA_CATALOG[pkg.name]?.description ?? '',
      };
    }
  }
  return null;
}

/**
 * Build the injectable `resolveApiSymbol` capability bound to a repo root — the
 * closure `@liteship/cli`'s `explain` adapter lands on the {@link CommandContext}.
 */
export function buildApiSymbolResolver(repoRoot: string): (symbol: string) => ApiSymbolResolution | null {
  return (symbol: string) => resolveApiSymbol(symbol, repoRoot);
}

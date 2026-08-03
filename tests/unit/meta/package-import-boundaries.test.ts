/**
 * A relative import in `packages/<pkg>/src` must resolve inside its own
 * package; cross-package traffic must ride a `@liteship/*` specifier.
 *
 * The law is an allowlist over the module-specifier grammar, not a denylist
 * of known-bad spellings: every specifier in shipped source is either
 * (1) relative and package-contained, (2) a bare `@liteship/*` package
 * specifier that stops at the package name, or (3) a bare external/builtin
 * specifier. Everything else fails closed:
 *
 *   - `escapes-package-root` — a `./`/`../` chain whose resolution leaves
 *     `packages/<pkg>/`. Source-run tooling (tsx, vitest, tsc) follows the
 *     path happily, then the compiled `dist/` carries it verbatim into a
 *     neighbouring package's unshipped `src/` tree and dies at import time
 *     with ERR_MODULE_NOT_FOUND. Only the shipped-package smoke lane can see
 *     that today; this law moves the detection into the unit lane.
 *   - `deep-src-specifier` — `@liteship/<pkg>/src/...` reaches through the
 *     package boundary into unshipped source by name instead of by path.
 *
 * The specifier walk is total over the import grammar: static imports
 * (including type-only), re-exports with a module specifier, dynamic
 * `import()` of a string literal, and `import =` external references.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { spawnArgvCapture } from '@liteship/command/host';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';

const repoRoot = resolve(import.meta.dirname, '../../..');
const normalizePath = (value: string): string => resolve(value).replaceAll('\\', '/');

interface ImportSite {
  readonly specifier: string;
  readonly line: number;
}

type ImportSiteEnumerator = (fileName: string, source: string) => readonly ImportSite[];

export interface BoundaryViolation {
  readonly file: string;
  readonly specifier: string;
  readonly line: number;
  readonly reason: 'escapes-package-root' | 'deep-src-specifier';
}

const DEEP_SRC_SPECIFIER = /^@liteship\/[^/]+\/src(?:\/|$)/u;

/** Every module specifier a source file declares, with its 1-based line. */
export function importSitesOf(fileName: string, source: string): readonly ImportSite[] {
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const sites: ImportSite[] = [];
  const record = (expression: ts.Expression): void => {
    if (!ts.isStringLiteralLike(expression)) return;
    const line = tree.getLineAndCharacterOfPosition(expression.getStart(tree)).line + 1;
    sites.push({ specifier: expression.text, line });
  };
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      record(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument !== undefined) record(argument);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      record(node.moduleReference.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return sites;
}

function boundaryViolationsFromSites(
  packagesRoot: string,
  packageName: string,
  relativeFile: string,
  sites: readonly ImportSite[],
): readonly BoundaryViolation[] {
  const packageRoot = normalizePath(join(packagesRoot, packageName));
  const absoluteFile = join(packagesRoot, relativeFile);
  const violations: BoundaryViolation[] = [];
  for (const site of sites) {
    if (site.specifier.startsWith('.')) {
      const resolved = normalizePath(resolve(dirname(absoluteFile), site.specifier));
      if (resolved !== packageRoot && !resolved.startsWith(`${packageRoot}/`)) {
        violations.push({
          file: relativeFile,
          specifier: site.specifier,
          line: site.line,
          reason: 'escapes-package-root',
        });
      }
    } else if (DEEP_SRC_SPECIFIER.test(site.specifier)) {
      violations.push({ file: relativeFile, specifier: site.specifier, line: site.line, reason: 'deep-src-specifier' });
    }
  }
  return violations;
}

/** Every boundary violation in one shipped source file. */
export function boundaryViolationsOf(
  packagesRoot: string,
  packageName: string,
  relativeFile: string,
  source: string,
): readonly BoundaryViolation[] {
  return boundaryViolationsFromSites(packagesRoot, packageName, relativeFile, importSitesOf(relativeFile, source));
}

interface ShippedCorpus {
  /** `<pkg>/src/...` paths keyed by their owning package. */
  readonly filesByPackage: ReadonlyMap<string, readonly string[]>;
  readonly violations: readonly BoundaryViolation[];
  readonly relativeSpecifierCount: number;
  readonly liteshipSpecifierCount: number;
}

function scanShippedCorpus(
  packagesRoot: string,
  files: readonly string[],
  enumerateImportSites: ImportSiteEnumerator = importSitesOf,
): ShippedCorpus {
  const filesByPackage = new Map<string, string[]>();
  const violations: BoundaryViolation[] = [];
  let relativeSpecifierCount = 0;
  let liteshipSpecifierCount = 0;
  for (const file of files) {
    const packageName = file.split('/')[0];
    if (packageName === undefined) continue;
    const bucket = filesByPackage.get(packageName) ?? [];
    bucket.push(file);
    filesByPackage.set(packageName, bucket);
    const source = readFileSync(join(packagesRoot, file), 'utf8');
    const sites = enumerateImportSites(file, source);
    for (const site of sites) {
      if (site.specifier.startsWith('.')) relativeSpecifierCount += 1;
      else if (site.specifier.startsWith('@liteship/')) liteshipSpecifierCount += 1;
    }
    violations.push(...boundaryViolationsFromSites(packagesRoot, packageName, file, sites));
  }
  return { filesByPackage, violations, relativeSpecifierCount, liteshipSpecifierCount };
}

const SHIPPED_SOURCE = /^packages\/[^/]+\/src\/.*\.(?:ts|tsx)$/u;

async function shippedSourceFiles(): Promise<readonly string[]> {
  const tracked = await spawnArgvCapture('git', ['ls-files', '--', 'packages'], {
    cwd: repoRoot,
    captureBytes: 4 * 1024 * 1024,
  });
  if (tracked.exitCode !== 0) {
    throw new Error(`git ls-files failed while enumerating shipped sources: ${tracked.stderr}`);
  }
  return tracked.stdout
    .split(/\r?\n/u)
    .filter((path) => SHIPPED_SOURCE.test(path))
    .map((path) => path.slice('packages/'.length));
}

let corpusMemo: Promise<ShippedCorpus> | undefined;
const shippedCorpus = (): Promise<ShippedCorpus> =>
  (corpusMemo ??= shippedSourceFiles().then((files) => scanShippedCorpus(join(repoRoot, 'packages'), files)));

describe('package import boundaries — the detector has teeth', () => {
  const packagesRoot = mkdtempSync(join(tmpdir(), 'pkg-import-boundaries-'));
  const write = (relativeFile: string, source: string): void => {
    const absolute = join(packagesRoot, relativeFile);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, source);
  };
  it('a relative import that escapes its package fires, in every import form', () => {
    write(
      'alpha/src/internal/deep.ts',
      [
        "import { ValidationError } from '../../../error/src/index.js';",
        "import type { Tag } from '../../../error/src/tags.js';",
        "export { hasTag } from '../../../error/src/index.js';",
        "const lazy = await import('../../../error/src/index.js');",
        'export const witness = { ValidationError, lazy };',
        'export type Witness = Tag;',
      ].join('\n'),
    );
    const source = readFileSync(join(packagesRoot, 'alpha/src/internal/deep.ts'), 'utf8');
    const found = boundaryViolationsOf(packagesRoot, 'alpha', 'alpha/src/internal/deep.ts', source);
    expect(found.map((violation) => violation.reason)).toEqual([
      'escapes-package-root',
      'escapes-package-root',
      'escapes-package-root',
      'escapes-package-root',
    ]);
    expect(found.map((violation) => violation.line)).toEqual([1, 2, 3, 4]);
  });
  it('a deep @liteship/*/src specifier fires; the bare package specifier does not', () => {
    write(
      'beta/src/index.ts',
      [
        "import { ValidationError } from '@liteship/error/src/index.js';",
        "import { IoError } from '@liteship/error';",
        'export const witness = { ValidationError, IoError };',
      ].join('\n'),
    );
    const source = readFileSync(join(packagesRoot, 'beta/src/index.ts'), 'utf8');
    const found = boundaryViolationsOf(packagesRoot, 'beta', 'beta/src/index.ts', source);
    expect(found).toEqual([
      { file: 'beta/src/index.ts', specifier: '@liteship/error/src/index.js', line: 1, reason: 'deep-src-specifier' },
    ]);
  });
  it('enumerates import sites exactly once per shipped source file', () => {
    const syntheticRoot = mkdtempSync(join(tmpdir(), 'pkg-import-enumeration-'));
    const files = ['alpha/src/index.ts', 'beta/src/index.ts'] as const;
    try {
      for (const file of files) {
        const absolute = join(syntheticRoot, file);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, "import type { Witness } from '@liteship/core';\nexport type Value = Witness;\n");
      }
      const enumerationCount = new Map<string, number>();
      const countingEnumerator: ImportSiteEnumerator = (fileName, source) => {
        enumerationCount.set(fileName, (enumerationCount.get(fileName) ?? 0) + 1);
        return importSitesOf(fileName, source);
      };

      scanShippedCorpus(syntheticRoot, files, countingEnumerator);

      expect(Object.fromEntries(enumerationCount)).toEqual({
        'alpha/src/index.ts': 1,
        'beta/src/index.ts': 1,
      });
    } finally {
      rmSync(syntheticRoot, { recursive: true, force: true });
    }
  });
  it('package-contained relatives, package.json reach, builtins, and third-party specifiers stay legal', () => {
    write(
      'gamma/src/io/reader.ts',
      [
        "import { helper } from '../shared/helper.js';",
        "import { sibling } from './sibling.js';",
        "import manifest from '../../package.json' with { type: 'json' };",
        "import { readFileSync } from 'node:fs';",
        "import ts from 'typescript';",
        'export const witness = { helper, sibling, manifest, readFileSync, ts };',
      ].join('\n'),
    );
    const source = readFileSync(join(packagesRoot, 'gamma/src/io/reader.ts'), 'utf8');
    expect(boundaryViolationsOf(packagesRoot, 'gamma', 'gamma/src/io/reader.ts', source)).toEqual([]);
    rmSync(packagesRoot, { recursive: true, force: true });
  });
});

describe('package import boundaries — the shipped tree complies', () => {
  it('the population is the real shipped tree, not a vacuous slice', async () => {
    const corpus = await shippedCorpus();
    const srcBearingPackages = readdirSync(join(repoRoot, 'packages'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => {
        try {
          return readdirSync(join(repoRoot, 'packages', name)).includes('src');
        } catch {
          return false;
        }
      });
    const scannedFileCount = [...corpus.filesByPackage.values()].reduce((total, bucket) => total + bucket.length, 0);
    expect(scannedFileCount).toBeGreaterThanOrEqual(500);
    for (const packageName of srcBearingPackages) {
      expect(
        corpus.filesByPackage.get(packageName)?.length ?? 0,
        `package ${packageName} contributes no scanned files`,
      ).toBeGreaterThan(0);
    }
    expect(corpus.relativeSpecifierCount).toBeGreaterThan(100);
    expect(corpus.liteshipSpecifierCount).toBeGreaterThan(10);
  });
  it('no shipped source escapes its package root or reaches into another package by src path', async () => {
    const corpus = await shippedCorpus();
    expect(corpus.violations).toEqual([]);
  });
});

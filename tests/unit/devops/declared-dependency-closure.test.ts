/**
 * Declared-dependency closure gate — the package law minted from the Wave-8
 * fast-check scar (issue #154).
 *
 * For every publishable @czap package this walks the SHIPPED runtime graph from
 * the package's MAIN entrypoint (`exports['.'].import`, over emitted `dist/*.js`),
 * collects every bare (external) import reached, and asserts each is a Node
 * builtin, the package's own subpath, or a DECLARED dependency. A bare import
 * satisfied only by a root-hoisted dev dependency — never declared by the package
 * itself — reds: a fresh consumer that installs the package plus its declared deps
 * would fail to resolve it (exactly the fast-check leak the packed-consumer proof
 * surfaced). Optional testing subpaths (`./harness`, `./testing`, `./simulation`)
 * are NOT reached from the main entry, so their test-only deps never contaminate
 * this main-surface check.
 *
 * The gate reads EMITTED `.js`, never source: `tsc` erases type-only imports
 * (`import type`, `typeof import('x')`), so a `typeof import('fast-check')` cast is
 * correctly NOT counted as a runtime dependency.
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  declaredDependencyClosureViolations,
  extractBareImportSpecifiers,
  isNodeBuiltin,
  packageNameOfSpecifier,
  type BareImport,
} from '../../../packages/cli/src/lib/declared-dependency-closure.js';
import { publishablePackageDirs } from '../../support/repo-truths.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Every STATIC (load-time) module specifier in a chunk of emitted `.js`, via the
 * TypeScript parser — so import-like text inside STRING LITERALS (the audit /
 * gauntlet gates that manipulate import syntax as data) is never mistaken for a
 * real import. Covers static `import`/`export … from` and side-effect `import 'x'`.
 * Dynamic `import()` is deliberately EXCLUDED — it is the guarded optional-
 * integration seam (@czap/cli → @czap/mcp-server), outside the load-time closure.
 */
function allSpecifiers(js: string, fileName: string): readonly string[] {
  const sf = ts.createSourceFile(fileName, js, ts.ScriptTarget.ESNext, /*setParentNodes*/ false);
  const specs: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specs.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return specs;
}

/** Resolve a relative dist specifier (`./foo.js`) to an on-disk file, or null. */
function resolveRelative(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(fromFile), spec);
  if (existsSync(base)) return base;
  if (existsSync(`${base}.js`)) return `${base}.js`;
  const idx = join(base, 'index.js');
  if (existsSync(idx)) return idx;
  return null;
}

/** BFS the emitted dist graph from `entry`, collecting every bare runtime import. */
function mainSurfaceBareImports(pkgDir: string, entry: string): readonly BareImport[] {
  const visited = new Set<string>();
  const queue: string[] = [entry];
  const bare: BareImport[] = [];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    let js: string;
    try {
      js = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = relative(pkgDir, file);
    for (const spec of allSpecifiers(js, rel)) {
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const target = resolveRelative(file, spec);
        if (target !== null) queue.push(target);
      } else {
        bare.push({ specifier: spec, file: rel });
      }
    }
  }
  return bare;
}

interface Manifest {
  readonly name?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly exports?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

describe('declared-dependency closure — publishable packages are main-surface dependency-closed', () => {
  const dirs = publishablePackageDirs();

  it('the publishable roster is non-empty (the sweep is not vacuous)', () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  for (const dir of dirs) {
    const pkgDir = resolve(REPO_ROOT, 'packages', dir);
    const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as Manifest;
    const mainRel = manifest.exports?.['.']?.['import'];
    // Type-only / declaration-only packages (e.g. @czap/_spine ships a stub) have
    // no runtime main entry — nothing to walk, trivially closed.
    if (mainRel === undefined) continue;
    const entry = resolve(pkgDir, mainRel);

    it(`${dir}: every main-surface runtime import is declared`, () => {
      expect(existsSync(entry), `${dir}: dist main entry ${mainRel} missing — run \`pnpm run build\` first`).toBe(true);
      const declared = new Set<string>([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.optionalDependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
      ]);
      const bareImports = mainSurfaceBareImports(pkgDir, entry);
      const violations = declaredDependencyClosureViolations({
        packageName: manifest.name ?? dir,
        declared,
        bareImports,
      });
      expect(violations, violations.join('\n')).toEqual([]);
    });
  }
});

describe('declared-dependency closure — the checker has teeth (negative control / the fast-check red fixture)', () => {
  it('flags an undeclared bare import (the exact fast-check leak class)', () => {
    const violations = declaredDependencyClosureViolations({
      packageName: '@czap/example',
      declared: new Set(['@czap/error']),
      bareImports: [
        { specifier: '@czap/error', file: 'dist/index.js' }, // declared → OK
        { specifier: 'node:fs', file: 'dist/index.js' }, // builtin → OK
        { specifier: 'fast-check', file: 'dist/capsules/x.js' }, // UNDECLARED → red
      ],
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('fast-check');
    expect(violations[0]).toContain('not a declared');
  });

  it('a declared dependency and its subpath both pass', () => {
    const violations = declaredDependencyClosureViolations({
      packageName: '@czap/core',
      declared: new Set(['cborg']),
      bareImports: [
        { specifier: 'cborg', file: 'dist/a.js' },
        { specifier: 'cborg/length', file: 'dist/b.js' }, // subpath of a declared dep → OK
        { specifier: '@czap/core/harness', file: 'dist/c.js' }, // own subpath → OK
      ],
    });
    expect(violations).toEqual([]);
  });

  it('extractBareImportSpecifiers finds STATIC imports, skips relative + dynamic', () => {
    const js = [
      `import * as fc from 'fast-check';`,
      `import { a } from './local.js';`,
      `export { b } from 'cborg';`,
      `import 'side-effect-pkg';`,
      `const m = await import('@scope/dyn');`,
    ].join('\n');
    const specs = extractBareImportSpecifiers(js);
    expect(specs).toContain('fast-check');
    expect(specs).toContain('cborg');
    expect(specs).toContain('side-effect-pkg');
    expect(specs).not.toContain('./local.js');
    // Dynamic import() is the guarded optional-integration seam — out of the
    // load-time closure, so it is NOT counted.
    expect(specs).not.toContain('@scope/dyn');
  });

  it('classifies specifiers into package names + builtins', () => {
    expect(packageNameOfSpecifier('@czap/core/harness')).toBe('@czap/core');
    expect(packageNameOfSpecifier('fast-check/lib/x')).toBe('fast-check');
    expect(isNodeBuiltin('node:fs')).toBe(true);
    expect(isNodeBuiltin('fs')).toBe(true);
    expect(isNodeBuiltin('fast-check')).toBe(false);
  });
});

/**
 * package-smoke pure helpers — the branch-heavy, spawn-FREE logic extracted from
 * the `package-smoke` subprocess-orchestration command (which is itself coverage-
 * excluded, the ship.ts precedent: a pure-orchestration command earns exclusion
 * ONLY once its composable pure helpers are extracted + unit-tested — this file is
 * that test).
 *
 * Real temp `node_modules` trees drive `findConsumerDependencyRoot`'s three
 * resolution strategies (no mocks); property-based + table cases pin
 * `peerDependenciesOnly`'s scoped-specifier split; `resolveExecutable` is pinned
 * over the real `process.platform`/`npm_execpath` (host-honest, no mutation of
 * globals); `tarballFileUrl` is pinned as a valid `file://` URL round-trip.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fc from 'fast-check';
import ts from 'typescript';
import { hasTag } from '@liteship/error';
import {
  resolveExecutable,
  tarballFileUrl,
  peerDependenciesOnly,
  findConsumerDependencyRoot,
  assertConsumerDependencyInstalled,
  partitionRuntimeClosureSpecifiers,
  diffSemanticClosures,
  diffJsonFields,
  semanticClosureFileHash,
  assertPackedTypeClosure,
  packedLiteshipBin,
} from '../../../../packages/cli/src/lib/package-smoke-helpers.js';

describe('packedLiteshipBin — facade owns the public executable', () => {
  it('never points release smoke at the implementation-only @liteship/cli package', () => {
    const path = packedLiteshipBin(join('C:', 'consumer')).replaceAll('\\', '/');
    expect(path).toBe('C:/consumer/node_modules/liteship/bin/liteship.mjs');
    expect(path).not.toContain('@liteship/cli');
  });
});

describe('peerDependenciesOnly — PEER_INSTALLS → {name: version} (split on LAST @)', () => {
  it('keeps the leading scope @ for a scoped specifier', () => {
    expect(peerDependenciesOnly(['@scope/pkg@1.2.3'])).toEqual({ '@scope/pkg': '1.2.3' });
  });

  it('handles an unscoped specifier', () => {
    expect(peerDependenciesOnly(['react@18.0.0'])).toEqual({ react: '18.0.0' });
  });

  it('maps every specifier in the list', () => {
    expect(peerDependenciesOnly(['@scope/a@1.0.0', 'b@2.0.0'])).toEqual({ '@scope/a': '1.0.0', b: '2.0.0' });
  });

  it('property: a `<name>@<version>` specifier round-trips to {name: version}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('@scope/a', '@liteship/core', 'react', 'cborg', 'mediabunny'),
        fc.constantFrom('1.0.0', '0.4.0', '18.2.1', '^2.0.0'),
        (name, version) => {
          const result = peerDependenciesOnly([`${name}@${version}`]);
          expect(result).toEqual({ [name]: version });
        },
      ),
    );
  });
});

describe('resolveExecutable — platform/npm_execpath executable resolution', () => {
  it('a non-pnpm command passes through unchanged', () => {
    expect(resolveExecutable('node')).toBe('node');
    expect(resolveExecutable('tar')).toBe('tar');
  });

  it('pnpm under a JS npm_execpath resolves to the current Node binary', () => {
    const prev = process.env['npm_execpath'];
    process.env['npm_execpath'] = '/some/pnpm.cjs';
    try {
      expect(resolveExecutable('pnpm')).toBe(process.execPath);
    } finally {
      if (prev === undefined) delete process.env['npm_execpath'];
      else process.env['npm_execpath'] = prev;
    }
  });

  it('pnpm under a NATIVE-binary npm_execpath runs the binary directly (@pnpm/exe — Blacksmith runners)', () => {
    const prev = process.env['npm_execpath'];
    // No .js/.cjs/.mjs extension → a standalone binary that must NOT be wrapped in
    // `node <path>` (which chokes on the ELF/Mach-O/PE header).
    process.env['npm_execpath'] = '/runner/.bin/store/v11/links/@pnpm/exe/pnpm';
    try {
      expect(resolveExecutable('pnpm')).toBe('/runner/.bin/store/v11/links/@pnpm/exe/pnpm');
    } finally {
      if (prev === undefined) delete process.env['npm_execpath'];
      else process.env['npm_execpath'] = prev;
    }
  });

  it('pnpm with no npm_execpath resolves to a literal (platform-dependent)', () => {
    const prev = process.env['npm_execpath'];
    delete process.env['npm_execpath'];
    try {
      const resolved = resolveExecutable('pnpm');
      // POSIX → 'pnpm'; win32 → 'pnpm.cmd'. Either way it is the bare command form.
      expect(resolved === 'pnpm' || resolved === 'pnpm.cmd').toBe(true);
    } finally {
      if (prev === undefined) delete process.env['npm_execpath'];
      else process.env['npm_execpath'] = prev;
    }
  });
});

describe('tarballFileUrl — tarball path → file:// URL round-trip', () => {
  it('produces a file:// URL that decodes back to the original path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-tarball-url-'));
    try {
      const tarball = join(dir, '@liteship-core-0.4.0.tgz');
      writeFileSync(tarball, 'x');
      const url = tarballFileUrl(tarball);
      expect(url.startsWith('file://')).toBe(true);
      // On POSIX the decode is exact; on win32 realpath may canonicalize case —
      // assert the basename survives the URL round-trip cross-platform.
      expect(fileURLToPath(url).endsWith('@liteship-core-0.4.0.tgz')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves physical identity and any remaining tilde for npm and pnpm file specs', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-tarball-short-path-'));
    try {
      const dir = join(root, 'RUNNER~1');
      mkdirSync(dir);
      const tarball = join(dir, 'liteship-1.0.0.tgz');
      writeFileSync(tarball, 'x');

      const url = tarballFileUrl(tarball);
      expect(url.toUpperCase()).not.toContain('%7E');
      expect(realpathSync.native(fileURLToPath(url))).toBe(realpathSync.native(tarball));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('findConsumerDependencyRoot — the three pnpm resolution strategies', () => {
  let consumer: string;
  beforeEach(() => {
    consumer = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
  });
  afterEach(() => rmSync(consumer, { recursive: true, force: true }));

  function plant(relDir: string): void {
    const abs = join(consumer, relDir);
    mkdirSync(abs, { recursive: true });
    writeFileSync(join(abs, 'package.json'), '{"name":"x"}');
  }

  it('strategy 1: a direct node_modules/<pkg> install', () => {
    plant(join('node_modules', '@liteship', 'core'));
    const root = findConsumerDependencyRoot(consumer, '@liteship/core');
    expect(root).toBe(join(consumer, 'node_modules', '@liteship', 'core'));
  });

  it('strategy 2: the hoisted .pnpm/node_modules/<pkg> location', () => {
    plant(join('node_modules', '.pnpm', 'node_modules', '@liteship', 'core'));
    const root = findConsumerDependencyRoot(consumer, '@liteship/core');
    expect(root).toBe(join(consumer, 'node_modules', '.pnpm', 'node_modules', '@liteship', 'core'));
  });

  it('strategy 3: a scan of the .pnpm store for <pkg>@ver/node_modules/<pkg>', () => {
    plant(join('node_modules', '.pnpm', '@liteship+core@0.4.0', 'node_modules', '@liteship', 'core'));
    const root = findConsumerDependencyRoot(consumer, '@liteship/core');
    expect(root).toBe(
      join(consumer, 'node_modules', '.pnpm', '@liteship+core@0.4.0', 'node_modules', '@liteship', 'core'),
    );
  });

  it('returns undefined when no strategy resolves (no store at all)', () => {
    expect(findConsumerDependencyRoot(consumer, '@liteship/core')).toBeUndefined();
  });

  it('returns undefined when the store exists but holds no matching entry', () => {
    mkdirSync(join(consumer, 'node_modules', '.pnpm', 'unrelated@1.0.0'), { recursive: true });
    expect(findConsumerDependencyRoot(consumer, '@liteship/core')).toBeUndefined();
  });
});

describe('assertConsumerDependencyInstalled — fail-closed when a dep is unresolvable', () => {
  let consumer: string;
  beforeEach(() => {
    consumer = mkdtempSync(join(tmpdir(), 'liteship-assert-dep-'));
  });
  afterEach(() => rmSync(consumer, { recursive: true, force: true }));

  it('is silent when the dependency resolves', () => {
    const dir = join(consumer, 'node_modules', '@liteship', 'core');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{"name":"@liteship/core"}');
    expect(() => assertConsumerDependencyInstalled(consumer, '@liteship/core')).not.toThrow();
  });

  it('throws a tagged IntegrityError naming the package + node_modules when absent', () => {
    let caught: unknown;
    try {
      assertConsumerDependencyInstalled(consumer, '@liteship/ghost');
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'IntegrityError')).toBe(true);
    expect((caught as Error).message).toContain('@liteship/ghost');
    expect((caught as Error).message).toContain('node_modules');
    expect((caught as Error).message).toContain('import-smoke cannot resolve it');
  });
});

describe('partitionRuntimeClosureSpecifiers — catalog-owned runtime authority', () => {
  const subpaths = [
    { packageName: '@liteship/core', specifier: '@liteship/core', runtimeTarget: './dist/index.js' },
    { packageName: '@liteship/_spine', specifier: '@liteship/_spine', runtimeTarget: './stub.js' },
    { packageName: '@liteship/_spine', specifier: '@liteship/_spine/core', runtimeTarget: './stub.js' },
    { packageName: '@liteship/astro', specifier: '@liteship/astro/Adaptive.astro', runtimeTarget: null },
  ] as const;

  it('imports modules, checks type-only stubs as refusals, and ignores host assets', () => {
    expect(
      partitionRuntimeClosureSpecifiers(subpaths, [
        { name: '@liteship/core', runtimeSurface: 'module' },
        { name: '@liteship/_spine', runtimeSurface: 'types-only' },
        { name: '@liteship/astro', runtimeSurface: 'module' },
      ]),
    ).toEqual({
      imports: ['@liteship/core'],
      refusals: [
        { packageName: '@liteship/_spine', specifier: '@liteship/_spine' },
        { packageName: '@liteship/_spine', specifier: '@liteship/_spine/core' },
      ],
    });
  });

  it('fails closed when an exported package has no catalog classification', () => {
    expect(() => partitionRuntimeClosureSpecifiers(subpaths, [])).toThrow(/no package-catalog runtime surface/);
  });
});

describe('diffSemanticClosures — bounded actionable reproducibility evidence', () => {
  it('reports added, removed, and changed paths in stable order', () => {
    const first = new Map([
      ['package/a.js', 'a1'],
      ['package/removed.js', 'r1'],
      ['package/same.js', 'same'],
    ]);
    const second = new Map([
      ['package/a.js', 'a2'],
      ['package/added.js', 'n1'],
      ['package/same.js', 'same'],
    ]);
    expect(diffSemanticClosures(first, second)).toEqual({
      total: 3,
      paths: [
        { path: 'package/a.js', firstHash: 'a1', secondHash: 'a2' },
        { path: 'package/added.js', firstHash: null, secondHash: 'n1' },
        { path: 'package/removed.js', firstHash: 'r1', secondHash: null },
      ],
      truncated: false,
    });
  });

  it('preserves the total while bounding disclosed paths', () => {
    const diff = diffSemanticClosures(
      new Map([
        ['b', '1'],
        ['a', '1'],
      ]),
      new Map([
        ['b', '2'],
        ['a', '2'],
      ]),
      1,
    );
    expect(diff).toEqual({
      total: 2,
      paths: [{ path: 'a', firstHash: '1', secondHash: '2' }],
      truncated: true,
    });
  });
});

describe('diffJsonFields — bounded package manifest evidence', () => {
  it('reports nested before/after fields with stable JSON Pointer paths', () => {
    const diff = diffJsonFields(
      {
        dependencies: { '@liteship/core': 'file:first.tgz', keep: '1.0.0' },
        files: ['dist', 'src'],
      },
      {
        dependencies: { '@liteship/core': 'file:second.tgz', keep: '1.0.0' },
        files: ['dist', 'types'],
      },
    );

    expect(diff.total).toBe(2);
    expect(diff.truncated).toBe(false);
    expect(
      diff.fields.map((entry) => ({ path: entry.path, first: entry.first.preview, second: entry.second.preview })),
    ).toEqual([
      {
        path: '/dependencies/@liteship~1core',
        first: '"file:first.tgz"',
        second: '"file:second.tgz"',
      },
      { path: '/files/1', first: '"src"', second: '"types"' },
    ]);
    expect(diff.fields.every((entry) => entry.first.sha256 !== entry.second.sha256)).toBe(true);
  });

  it('distinguishes missing fields and bounds field count and value previews', () => {
    const diff = diffJsonFields({ a: 'abcdefgh', removed: true }, { a: 'abcdefXY', added: true }, 2, 5);

    expect(diff).toMatchObject({ total: 3, truncated: true });
    expect(diff.fields).toHaveLength(2);
    expect(diff.fields[0]).toMatchObject({
      path: '/a',
      first: { present: true, preview: '"abcd', truncated: true },
      second: { present: true, preview: '"abcd', truncated: true },
    });
    expect(diff.fields[0]?.first.sha256).not.toBe(diff.fields[0]?.second.sha256);
    expect(diff.fields[1]).toMatchObject({
      path: '/added',
      first: { present: false, preview: null, sha256: null, truncated: false },
      second: { present: true, preview: 'true', truncated: false },
    });
  });

  it('treats object key ordering as formatting-only rather than a field change', () => {
    expect(diffJsonFields({ b: 2, a: 1 }, { a: 1, b: 2 })).toEqual({
      total: 0,
      fields: [],
      truncated: false,
    });
  });
});

describe('semanticClosureFileHash — JSON manifest semantics', () => {
  it('ignores package.json whitespace and object-key ordering', () => {
    const first = Buffer.from('{"name":"fixture","dependencies":{"b":"2","a":"1"}}\n');
    const second = Buffer.from('{\n  "dependencies": { "a": "1", "b": "2" },\n  "name": "fixture"\n}\n');

    expect(semanticClosureFileHash('package/package.json', first)).toBe(
      semanticClosureFileHash('package/package.json', second),
    );
  });

  it('retains a real package.json field-value change as semantic drift', () => {
    const first = Buffer.from('{"name":"fixture","version":"1.0.0"}');
    const second = Buffer.from('{"name":"fixture","version":"1.0.1"}');

    expect(semanticClosureFileHash('package/package.json', first)).not.toBe(
      semanticClosureFileHash('package/package.json', second),
    );
  });

  it.each(['exports', 'imports'] as const)(
    'preserves %s condition-object order because node/default reversal changes resolution',
    (field) => {
      const key = field === 'exports' ? '.' : '#runtime';
      const first = Buffer.from(
        JSON.stringify({ name: 'fixture', [field]: { [key]: { node: './node.js', default: './default.js' } } }),
      );
      const reversed = Buffer.from(
        JSON.stringify({ name: 'fixture', [field]: { [key]: { default: './default.js', node: './node.js' } } }),
      );

      expect(semanticClosureFileHash('package/package.json', first)).not.toBe(
        semanticClosureFileHash('package/package.json', reversed),
      );
    },
  );

  it('still canonicalizes unordered export subpath maps', () => {
    const first = Buffer.from(
      JSON.stringify({ exports: { './b': { default: './b.js' }, './a': { default: './a.js' } } }),
    );
    const second = Buffer.from(
      JSON.stringify({ exports: { './a': { default: './a.js' }, './b': { default: './b.js' } } }),
    );

    expect(semanticClosureFileHash('package/package.json', first)).toBe(
      semanticClosureFileHash('package/package.json', second),
    );
  });

  it('reports conditional-order drift as a package manifest semantic field diff', () => {
    const first = { exports: { '.': { node: './node.js', default: './default.js' } } };
    const reversed = { exports: { '.': { default: './default.js', node: './node.js' } } };

    const diff = diffJsonFields(first, reversed);
    expect(diff.total).toBe(1);
    expect(diff.fields[0]?.path).toBe('/exports/.');
    expect(diff.fields[0]?.first.sha256).not.toBe(diff.fields[0]?.second.sha256);
  });
});

describe('assertPackedTypeClosure — exact physical declaration proof', () => {
  let consumer: string;
  const entry = { packageName: 'fixture-pkg', specifier: 'fixture-pkg', typesTarget: './dist/index.d.ts' } as const;

  beforeEach(() => {
    consumer = mkdtempSync(join(tmpdir(), 'liteship-packed-types-'));
    mkdirSync(join(consumer, 'node_modules'), { recursive: true });
    writeFileSync(join(consumer, 'package.json'), '{"name":"consumer","private":true,"type":"module"}');
  });
  afterEach(() => rmSync(consumer, { recursive: true, force: true }));

  function plantPackage(args: { readonly declaration?: string | null; readonly typesTarget?: string } = {}): string {
    const packageRoot = join(consumer, 'node_modules', 'fixture-pkg');
    const dist = join(packageRoot, 'dist');
    mkdirSync(dist, { recursive: true });
    const typesTarget = args.typesTarget ?? './dist/index.d.ts';
    writeFileSync(
      join(packageRoot, 'package.json'),
      JSON.stringify({
        name: 'fixture-pkg',
        type: 'module',
        exports: { '.': { types: typesTarget, default: './dist/index.js' } },
      }),
    );
    writeFileSync(join(dist, 'index.js'), 'export const value = true;\n');
    if (args.declaration !== null) {
      writeFileSync(join(dist, 'index.d.ts'), args.declaration ?? 'export declare const value: true;\n');
    }
    return packageRoot;
  }

  it('accepts the exact packed declaration with zero diagnostics under Node16 and Bundler', () => {
    plantPackage();
    expect(() => assertPackedTypeClosure(ts, consumer, [entry])).not.toThrow();
  });

  it('rejects a public types condition that resolves to JavaScript', () => {
    plantPackage({ typesTarget: './dist/index.js' });
    const jsEntry = { ...entry, typesTarget: './dist/index.js' };
    expect(() => assertPackedTypeClosure(ts, consumer, [jsEntry], ['bundler'])).toThrow(/not a declaration/);
  });

  it('rejects a missing declared types target instead of accepting runtime fallback', () => {
    plantPackage({ declaration: null });
    expect(() => assertPackedTypeClosure(ts, consumer, [entry], ['bundler'])).toThrow(/declares missing types target/);
  });

  it('rejects malformed packed declarations through pre-emit diagnostics', () => {
    plantPackage({ declaration: 'export interface Broken {\n' });
    expect(() => assertPackedTypeClosure(ts, consumer, [entry], ['bundler'])).toThrow(
      /failed bundler pre-emit diagnostics \(1\):\n.*:\d+:\d+ TS1005/s,
    );
  });

  it('reports semantic diagnostics from the packed declaration itself', () => {
    plantPackage({ declaration: 'export declare const value: MissingOwnedType;\n' });
    expect(() => assertPackedTypeClosure(ts, consumer, [entry], ['node16'])).toThrow(
      /failed node16 pre-emit diagnostics \(1\):\n.*:\d+:\d+ TS2304 Cannot find name 'MissingOwnedType'/s,
    );
  });

  it('rejects an owned declaration that imports a missing external symbol', () => {
    const externalRoot = join(consumer, 'node_modules', 'external-types');
    mkdirSync(externalRoot, { recursive: true });
    writeFileSync(
      join(externalRoot, 'package.json'),
      JSON.stringify({
        name: 'external-types',
        type: 'module',
        exports: { '.': { types: './index.d.ts' } },
      }),
    );
    writeFileSync(join(externalRoot, 'index.d.ts'), 'export interface PresentExternal {}\n');
    plantPackage({
      declaration:
        "import type { MissingExternal } from 'external-types';\nexport declare const value: MissingExternal;\n",
    });

    expect(() => assertPackedTypeClosure(ts, consumer, [entry], ['node16'])).toThrow(
      /failed node16 pre-emit diagnostics \(1\):\n.*:\d+:\d+ TS2305 Module '"external-types"' has no exported member 'MissingExternal'/s,
    );
  });

  it('rejects a transitive declaration conflict reachable from the public type graph', () => {
    const externalRoot = join(consumer, 'node_modules', 'external-types');
    mkdirSync(externalRoot, { recursive: true });
    writeFileSync(
      join(externalRoot, 'package.json'),
      JSON.stringify({
        name: 'external-types',
        type: 'module',
        exports: { '.': { types: './index.d.ts' } },
      }),
    );
    writeFileSync(
      join(externalRoot, 'index.d.ts'),
      'declare const externalConflict: string;\ndeclare const externalConflict: number;\n',
    );
    plantPackage({ declaration: "import 'external-types';\nexport declare const value: true;\n" });

    expect(() => assertPackedTypeClosure(ts, consumer, [entry], ['node16'])).toThrow(
      /failed node16 pre-emit diagnostics \(2\):\n.*external-types.*:\d+:\d+ TS2451 Cannot redeclare block-scoped variable 'externalConflict'/s,
    );
  });

  it('rejects a package whose physical declaration escapes the packed node_modules tree', () => {
    const outsidePackage = join(consumer, 'workspace-package');
    const outsideDist = join(outsidePackage, 'dist');
    mkdirSync(outsideDist, { recursive: true });
    writeFileSync(
      join(outsidePackage, 'package.json'),
      JSON.stringify({
        name: 'fixture-pkg',
        type: 'module',
        exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
      }),
    );
    writeFileSync(join(outsideDist, 'index.d.ts'), 'export declare const value: true;\n');
    writeFileSync(join(outsideDist, 'index.js'), 'export const value = true;\n');
    symlinkSync(outsidePackage, join(consumer, 'node_modules', 'fixture-pkg'), 'junction');

    expect(() => assertPackedTypeClosure(ts, consumer, [entry], ['bundler'])).toThrow(/escaped packed node_modules/);
  });
});

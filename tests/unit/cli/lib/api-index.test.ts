/**
 * api-index — the SYMBOL arm's INSTALLED-package fallback. When there is no
 * `packages/*​/src` checkout (a consumer app), `resolveApiSymbol` walks up to the
 * nearest `node_modules` and follows each installed package's real exports map.
 * Private declarations that are not reachable through an export-map entry must
 * never appear in the index.
 *
 * The fixture is a hermetic tmp dir: a single installed `@liteship/core` package
 * with root and subpath barrels. No source tree, no network — same bytes produce
 * the same consumer-importable resolution.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveApiSymbol } from '../../../../packages/cli/src/lib/api-index.js';

let appRoot: string;

beforeAll(() => {
  appRoot = mkdtempSync(join(tmpdir(), 'liteship-api-index-'));
  const distDir = join(appRoot, 'node_modules', '@liteship', 'core', 'dist');
  mkdirSync(distDir, { recursive: true });
  writeFileSync(
    join(appRoot, 'node_modules', '@liteship', 'core', 'package.json'),
    JSON.stringify({
      name: '@liteship/core',
      version: '0.0.0',
      exports: {
        '.': { types: './dist/index.d.ts' },
        './tools': { types: './dist/tools.d.ts' },
        './private': null,
        './pattern/*': './dist/*.d.ts',
      },
    }),
  );
  writeFileSync(join(distDir, 'index.d.ts'), "export { someUniqueSym } from './foo.js';\n");
  writeFileSync(
    join(distDir, 'foo.d.ts'),
    [
      '/**',
      ' * A uniquely-named installed symbol used only by this fallback test.',
      ' *',
      ' * @remarks trailing tag content is excluded from the first paragraph.',
      ' */',
      'export declare const someUniqueSym: number;',
      '',
    ].join('\n'),
  );
  writeFileSync(join(distDir, 'private.d.ts'), 'export declare const privateOnly: number;\n');
  writeFileSync(
    join(distDir, 'tools.d.ts'),
    '/** A public subpath symbol. */\nexport declare function subpathSym(): void;\n',
  );
});

afterAll(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe('resolveApiSymbol — installed-package fallback (no source checkout)', () => {
  it('resolves a symbol from node_modules/@liteship/*/dist/*.d.ts with a package-relative file', () => {
    const resolution = resolveApiSymbol('someUniqueSym', appRoot);
    expect(resolution).not.toBeNull();
    expect(resolution?.symbol).toBe('someUniqueSym');
    expect(resolution?.package).toBe('@liteship/core');
    expect(resolution?.subpath).toBe('.');
    expect(resolution?.file).toBe('dist/foo.d.ts');
    expect(resolution?.kind).toBe('const');
    expect(resolution?.summary).toBe('A uniquely-named installed symbol used only by this fallback test.');
    // packageDescription is lifted from the catalog, proving the scope is publishable.
    expect(resolution?.packageDescription.length).toBeGreaterThan(0);
  });

  it('returns null for a symbol no installed package declares', () => {
    expect(resolveApiSymbol('noSuchInstalledSymbol', appRoot)).toBeNull();
  });

  it('never reports a private declaration that is not reachable from package exports', () => {
    expect(resolveApiSymbol('privateOnly', appRoot)).toBeNull();
  });

  it('reports the exact consumer-importable subpath', () => {
    const resolution = resolveApiSymbol('subpathSym', appRoot);
    expect(resolution).toMatchObject({
      package: '@liteship/core',
      subpath: './tools',
      file: 'dist/tools.d.ts',
      kind: 'function',
    });
  });
});

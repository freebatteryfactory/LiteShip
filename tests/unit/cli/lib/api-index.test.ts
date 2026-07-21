/**
 * api-index — the SYMBOL arm's INSTALLED-package fallback. When there is no
 * `packages/*​/src` checkout (a consumer app), `resolveApiSymbol` walks up to the
 * nearest `node_modules/@liteship` and scans each installed package's published
 * `.d.ts` for the declaration, lifting the same package + kind + first-paragraph
 * TSDoc summary the source scan produces.
 *
 * The fixture is a hermetic tmp dir: a single installed `@liteship/core` package
 * with one `dist/*.d.ts` carrying a TSDoc block + an `export declare const`. No
 * source tree, no network — same bytes → byte-identical resolution.
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
    JSON.stringify({ name: '@liteship/core', version: '0.0.0' }),
  );
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
});

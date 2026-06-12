/**
 * Build-side token/theme manifest derivation tests.
 *
 * `collectTokenManifest` / `collectThemeManifest` scan a project for
 * convention modules and derive the manifests behind `virtual:czap/tokens`,
 * `virtual:czap/tokens.css`, and `virtual:czap/themes`.
 */

import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Diagnostics, Token, Theme } from '@czap/core';
import {
  collectTokenManifest,
  collectThemeManifest,
  compileCollectedTokensCss,
} from '../../../packages/vite/src/token-manifest.js';
import { plugin } from '../../../packages/vite/src/plugin.js';
import { loadVirtualModule } from '../../../packages/vite/src/virtual-modules.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'czap-token-manifest-'));
  tempDirs.push(dir);
  return dir;
}

function writeModule(dir: string, fileName: string, source: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), source);
}

afterEach(() => {
  Diagnostics.reset();
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

const referenceToken = Token.make({ name: 'accent', category: 'color', value: '#4f46e5' });
const referenceTheme = Theme.make({
  name: 'brand',
  variants: ['light', 'dark'] as const,
  tokens: { accent: { light: '#4f46e5', dark: '#818cf8' } },
});

const TOKEN_MODULE = `
export const accent = {
  _tag: 'TokenDef',
  _version: 1,
  id: ${JSON.stringify(referenceToken.id)},
  name: 'accent',
  category: 'color',
  axes: [],
  values: {},
  fallback: '#4f46e5',
  cssProperty: '--czap-accent',
};
`;

const THEME_MODULE = `
export const brand = {
  _tag: 'ThemeDef',
  _version: 1,
  id: ${JSON.stringify(referenceTheme.id)},
  name: 'brand',
  variants: ['light', 'dark'],
  tokens: { accent: { light: '#4f46e5', dark: '#818cf8' } },
};
`;

describe('collectTokenManifest', () => {
  test('derives token records from convention modules', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'colors.tokens.ts', TOKEN_MODULE);

    const manifest = await collectTokenManifest(root);

    expect(Object.keys(manifest)).toEqual(['accent']);
    expect(manifest.accent!.id).toBe(referenceToken.id);
    expect(manifest.accent!._tag).toBe('TokenDef');
  });

  test('compileCollectedTokensCss merges all tokens into one :root block', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'tokens.ts', TOKEN_MODULE);

    const manifest = await collectTokenManifest(root);
    const css = compileCollectedTokensCss(manifest);

    expect(css).toContain(':root {');
    expect(css).toContain('--czap-accent: #4f46e5');
    expect(css.match(/:root \{/g)?.length).toBe(1);
  });

  test('returns empty manifest when nothing is found', async () => {
    const root = makeTempDir();
    expect(await collectTokenManifest(root)).toEqual({});
    expect(compileCollectedTokensCss({})).toBe(':root {}');
  });

  test('skips node_modules and dist while scanning', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'node_modules', 'dep'), 'tokens.ts', TOKEN_MODULE);
    writeModule(join(root, 'dist'), 'extra.tokens.ts', TOKEN_MODULE);

    expect(await collectTokenManifest(root)).toEqual({});
  });

  test('honors the tokenDir override outside the walked tree', async () => {
    const root = makeTempDir();
    const defs = makeTempDir();
    writeModule(defs, 'tokens.ts', TOKEN_MODULE);

    const manifest = await collectTokenManifest(root, { tokenDir: defs });

    expect(manifest.accent!.id).toBe(referenceToken.id);
  });

  test('scan terminates on circular directory symlinks and still derives entries', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'tokens.ts', TOKEN_MODULE);
    try {
      symlinkSync(root, join(srcDir, 'loop'), 'dir');
    } catch {
      return;
    }

    const manifest = await collectTokenManifest(root);
    expect(manifest.accent!.id).toBe(referenceToken.id);
  });
});

describe('collectThemeManifest', () => {
  test('derives theme records from convention modules', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'brand.themes.ts', THEME_MODULE);

    const manifest = await collectThemeManifest(root);

    expect(Object.keys(manifest)).toEqual(['brand']);
    expect(manifest.brand!.id).toBe(referenceTheme.id);
    expect(manifest.brand!._tag).toBe('ThemeDef');
  });

  test('honors the themeDir override outside the walked tree', async () => {
    const root = makeTempDir();
    const defs = makeTempDir();
    writeModule(defs, 'themes.ts', THEME_MODULE);

    const manifest = await collectThemeManifest(root, { themeDir: defs });

    expect(manifest.brand!.id).toBe(referenceTheme.id);
  });
});

describe('plugin virtual:czap/tokens wiring', () => {
  function makeModuleGraphMock() {
    const invalidated: string[] = [];
    const virtualModules = [
      { id: '\0virtual:czap/tokens' },
      { id: '\0virtual:czap/tokens.css' },
      { id: '\0virtual:czap/themes' },
    ];
    return {
      invalidated,
      moduleGraph: {
        idToModuleMap: new Map<string, { id: string }>([[join('src', 'page.css'), { id: join('src', 'page.css') }]]),
        getModuleById(id: string) {
          return virtualModules.find((mod) => mod.id === id);
        },
        invalidateModule(mod: { id: string }) {
          invalidated.push(mod.id);
        },
      },
    };
  }

  test('plugin load serves collected tokens/themes and hotUpdate refreshes them', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'tokens.ts', TOKEN_MODULE);
    writeModule(srcDir, 'themes.ts', THEME_MODULE);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const tokensLoad = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/tokens',
    );
    expect(tokensLoad).toContain(referenceToken.id);
    expect(tokensLoad).not.toBe('export const tokens = {};');

    const cssLoad = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/tokens.css',
    );
    expect(cssLoad).toContain('--czap-accent');

    const themesLoad = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/themes',
    );
    expect(themesLoad).toContain(referenceTheme.id);

    writeModule(srcDir, 'extra.tokens.ts', TOKEN_MODULE.replace('accent', 'highlight'));
    const { invalidated, moduleGraph } = makeModuleGraphMock();
    (vitePlugin.hotUpdate as (this: unknown, options: { file: string; modules: unknown[] }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'extra.tokens.ts'), modules: [] },
    );
    expect(invalidated).toContain('\0virtual:czap/tokens');
    expect(invalidated).toContain('\0virtual:czap/tokens.css');
    expect(invalidated).toContain('\0virtual:czap/themes');
  });

  test('editing an EXISTING tokens module busts the ESM import cache on reload', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'tokens.ts', TOKEN_MODULE);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const first = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/tokens.css',
    );
    expect(first).toContain('#4f46e5');

    writeModule(srcDir, 'tokens.ts', TOKEN_MODULE.replace('#4f46e5', '#111111'));
    utimesSync(join(srcDir, 'tokens.ts'), new Date(), new Date(Date.now() + 5_000));
    const { moduleGraph } = makeModuleGraphMock();
    (vitePlugin.hotUpdate as (this: unknown, options: { file: string; modules: unknown[] }) => unknown).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'tokens.ts').replace(/\\/g, '/'), modules: [] },
    );

    const second = await (vitePlugin.load as (id: string) => Promise<string | undefined>).call(
      undefined as never,
      '\0virtual:czap/tokens.css',
    );
    expect(second).toContain('#111111');
    expect(second).not.toContain('#4f46e5');
  });

  test('hotUpdate preserves options.modules when returning affected modules', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    writeModule(srcDir, 'tokens.ts', TOKEN_MODULE);

    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root, command: 'serve' } as never);

    const pageModule = { id: join('src', 'page.css') };
    const { moduleGraph } = makeModuleGraphMock();
    const affected = (
      vitePlugin.hotUpdate as (this: unknown, options: { file: string; modules: unknown[] }) => unknown
    ).call(
      { environment: { moduleGraph } },
      { file: join(srcDir, 'tokens.ts').replace(/\\/g, '/'), modules: [pageModule] },
    );
    expect(affected).toContainEqual(pageModule);
  });
});

describe('loadVirtualModule token/theme data', () => {
  test('serializes provided manifests into virtual module source', async () => {
    const root = makeTempDir();
    writeModule(join(root, 'src'), 'tokens.ts', TOKEN_MODULE);
    writeModule(join(root, 'src'), 'themes.ts', THEME_MODULE);
    const tokens = await collectTokenManifest(root);
    const themes = await collectThemeManifest(root);

    expect(loadVirtualModule('\0virtual:czap/tokens', { tokens })).toContain(referenceToken.id);
    expect(loadVirtualModule('\0virtual:czap/tokens.css', { tokens })).toContain('--czap-accent');
    expect(loadVirtualModule('\0virtual:czap/themes', { themes })).toContain(referenceTheme.id);
  });

  test('degrades to empty stubs without data (type-checker / bare-bundler path)', () => {
    expect(loadVirtualModule('\0virtual:czap/tokens')).toBe('export const tokens = {};');
    expect(loadVirtualModule('\0virtual:czap/tokens.css')).toBe(':root {}');
    expect(loadVirtualModule('\0virtual:czap/themes')).toBe('export const themes = {};');
  });
});

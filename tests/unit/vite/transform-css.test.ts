/**
 * Standalone `transformCss` tests — the 4-phase CSS walk exercised WITHOUT
 * the Vite plugin lifecycle.
 *
 * `transformCss(code, id, ctx)` is a pure function over an explicit context
 * (a `warn` sink, an `addWatchFile` registrar, a `PrimitiveResolutionCache`,
 * the project root + dirs). These tests build that context directly, with no
 * `plugin()` factory and no fake Rollup `this` — that isolation is the point
 * of the B-2 split. They pin the deterministic token→theme→style→quantize
 * ordering, the parse-miss / unresolved warnings, the resolution caching, the
 * watch-file registration, and the sheet-level viewport-containment rule.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Boundary, Theme, Token } from '@liteship/core';
import { transformCss, type TransformCssContext } from '../../../packages/vite/src/transform-css.js';
import {
  createPrimitiveResolutionCache,
  type PrimitiveResolutionCache,
} from '../../../packages/vite/src/primitive-resolution-cache.js';
import * as PrimitiveResolveModule from '../../../packages/vite/src/primitive-resolve.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-transform-css-'));
  tempDirs.push(dir);
  return dir;
}

function writeModule(dir: string, fileName: string, exportName: string, value: unknown): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), `export const ${exportName} = ${JSON.stringify(value, null, 2)};\n`);
}

/**
 * Build a bare {@link TransformCssContext} plus side-channel capture arrays.
 * No plugin, no Rollup `this` — exactly the isolation the standalone function
 * now enables.
 */
function makeCtx(
  projectRoot: string,
  overrides?: Partial<TransformCssContext> & { cache?: PrimitiveResolutionCache },
): {
  ctx: TransformCssContext;
  warnings: string[];
  watched: string[];
  cache: PrimitiveResolutionCache;
} {
  const warnings: string[] = [];
  const watched: string[] = [];
  const cache = overrides?.cache ?? createPrimitiveResolutionCache();
  const ctx: TransformCssContext = {
    warn: (message) => warnings.push(message),
    addWatchFile: (file) => watched.push(file),
    cache,
    projectRoot,
    ...overrides,
  };
  return { ctx, warnings, watched, cache };
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('transformCss (standalone, no plugin lifecycle)', () => {
  test('returns null for css with no @liteship at-rules without touching the resolver', async () => {
    const resolveSpy = vi.spyOn(PrimitiveResolveModule, 'resolvePrimitive');
    const { ctx } = makeCtx(makeTempDir());

    expect(await transformCss('.card { color: red; }', 'plain.css', ctx)).toBeNull();
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  test('compiles token, theme, and quantize blocks in one sheet and watches their sources', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });

    const token = Token.make({
      name: 'accent',
      category: 'color',
      axes: ['theme'] as const,
      values: { light: '#ffffff', dark: '#000000' },
      fallback: '#ffffff',
    });
    const theme = Theme.make({
      name: 'brand',
      variants: ['light', 'dark'] as const,
      tokens: { accent: { light: '#ffffff', dark: '#000000' } },
      meta: { light: { label: 'Light', mode: 'light' }, dark: { label: 'Dark', mode: 'dark' } },
    });
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'mobile'],
        [768, 'desktop'],
      ] as const,
    });

    writeModule(srcDir, 'tokens.ts', 'accent', token);
    writeModule(srcDir, 'themes.ts', 'brand', theme);
    writeModule(srcDir, 'boundaries.ts', 'layout', boundary);

    const css = `
@token accent { margin: 0; }
@theme brand { font-weight: 700; }
@quantize layout {
  mobile { display: block; }
  desktop { display: grid; }
}
`;

    const { ctx, warnings, watched } = makeCtx(root);
    const out = await transformCss(css, join(srcDir, 'app.css'), ctx);

    expect(warnings).toEqual([]);
    expect(out).not.toBeNull();
    expect(out).toContain('--liteship-accent');
    expect(out).toContain('html[data-theme="light"]');
    expect(out).toContain('@container');
    // Each resolved convention file was registered for watching.
    expect(watched).toContain(join(srcDir, 'tokens.ts'));
    expect(watched).toContain(join(srcDir, 'themes.ts'));
    expect(watched).toContain(join(srcDir, 'boundaries.ts'));
  });

  test('reuses the resolution cache across repeated transforms of the same id', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });

    const token = Token.make({
      name: 'accent',
      category: 'color',
      axes: ['theme'] as const,
      values: { light: '#ffffff' },
      fallback: '#ffffff',
    });
    writeModule(srcDir, 'tokens.ts', 'accent', token);

    const resolveSpy = vi.spyOn(PrimitiveResolveModule, 'resolvePrimitive');
    const { ctx } = makeCtx(root);
    const css = '@token accent {}';

    await transformCss(css, join(srcDir, 'app.css'), ctx);
    await transformCss(css, join(srcDir, 'app.css'), ctx);

    // Resolved once on the first pass; the shared cache short-circuits the second.
    expect(resolveSpy).toHaveBeenCalledTimes(1);
  });

  test('warns with file:line + grammar when a @token dialect parses to zero blocks', async () => {
    const { ctx, warnings } = makeCtx(makeTempDir());
    const css = ':root {\n  @token primary: var(--liteship-primary);\n}\n';

    const out = await transformCss(css, 'dialects.css', ctx);

    expect(out).toBeNull();
    expect(warnings.some((m) => m.includes('no @token block parsed') && m.includes('dialects.css:2'))).toBe(true);
    expect(warnings.every((m) => m.includes('Fix: rewrite it to the supported grammar'))).toBe(true);
  });

  test('warns and leaves css unchanged when a token cannot be resolved', async () => {
    const root = makeTempDir();
    const { ctx, warnings } = makeCtx(root);

    const out = await transformCss('@token missing { color: red; }', join(root, 'src', 'broken.css'), ctx);

    expect(out).toBeNull();
    expect(warnings[0]).toContain('Could not resolve token "missing"');
  });

  test('aggregates multiple viewport boundaries into one :root containment rule', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });

    const widthBoundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'narrow'],
        [768, 'wide'],
      ] as const,
    });
    const bareBoundary = Boundary.make({
      input: 'viewport',
      at: [
        [0, 'short'],
        [600, 'tall'],
      ] as const,
    });
    writeFileSync(
      join(srcDir, 'boundaries.ts'),
      `export const layoutW = ${JSON.stringify(widthBoundary, null, 2)};\n` +
        `export const layoutH = ${JSON.stringify(bareBoundary, null, 2)};\n`,
    );

    const css = `
@quantize layoutW {
  narrow { .grid { grid-template-columns: 1fr; } }
}

@quantize layoutH {
  short { .grid { max-height: 50vh; } }
}
`;

    const { ctx, warnings } = makeCtx(root);
    const out = await transformCss(css, join(srcDir, 'layouts.css'), ctx);

    expect(warnings).toEqual([]);
    const rootRules = out!.match(/:root \{[^}]*\}/g) ?? [];
    expect(rootRules).toHaveLength(1);
    expect(rootRules[0]).toContain('container-name: viewport-width viewport');
  });

  test('is a no-op for addWatchFile-absent contexts (still resolves and compiles)', async () => {
    const root = makeTempDir();
    const srcDir = join(root, 'src');
    mkdirSync(srcDir, { recursive: true });

    const token = Token.make({
      name: 'accent',
      category: 'color',
      axes: ['theme'] as const,
      values: { light: '#ffffff' },
      fallback: '#ffffff',
    });
    writeModule(srcDir, 'tokens.ts', 'accent', token);

    // No addWatchFile: a bare context, exactly the "outside watch mode" case.
    const { ctx } = makeCtx(root, { addWatchFile: undefined });
    const out = await transformCss('@token accent { margin: 0; }', join(srcDir, 'app.css'), ctx);

    expect(out).toContain('--liteship-accent');
  });
});

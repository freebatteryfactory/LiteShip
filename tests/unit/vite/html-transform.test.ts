/**
 * HTML transform tests -- data-liteship="name" -> resolved boundary JSON.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Diagnostics, defineBoundary } from '@liteship/core';
import { transformHTML } from '../../../packages/vite/src/html-transform.js';
import { transformHTMLWithResolver } from '../../../packages/vite/src/html-transform-engine.js';
import { plugin } from '../../../packages/vite/src/plugin.js';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-html-transform-'));
  tempDirs.push(dir);
  return dir;
}

function testBoundary() {
  return defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'desktop'],
    ] as const,
    hysteresis: 32,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  Diagnostics.reset();
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('transformHTML', () => {
  test('returns source unchanged when no data-liteship attributes found', async () => {
    const source = '<div class="foo">hello</div>';
    const result = await transformHTML(source, '/test/page.astro', '/test');
    expect(result).toBe(source);
  });

  test('does not modify data-liteship-boundary (already resolved)', async () => {
    const source = '<div data-liteship-boundary=\'{"id":"hero"}\'></div>';
    const result = await transformHTML(source, '/test/page.astro', '/test');
    expect(result).toBe(source);
  });

  test('does not modify data-liteship-state or other data-liteship-* attrs', async () => {
    const source = '<div data-liteship-state="mobile" data-liteship-stream-url="/api"></div>';
    const result = await transformHTML(source, '/test/page.astro', '/test');
    expect(result).toBe(source);
  });

  test('ignores data-liteship macros inside HTML comments and code samples', async () => {
    const boundary = testBoundary();
    const resolveBoundary = vi.fn(async () => ({ primitive: boundary, source: '/test/boundaries.ts' }));
    const commentLine = '<!-- teaching: data-liteship="viewport" is the macro label -->';
    const codeSample = '<pre><code>&lt;div data-liteship="viewport"&gt;</code></pre>';
    const live = '<div data-liteship="viewport"></div>';
    const source = [commentLine, codeSample, live].join('\n');
    const result = await transformHTMLWithResolver(source, '/test/page.astro', '/test', undefined, resolveBoundary);

    expect(result).toContain(commentLine);
    expect(result).toContain(codeSample);
    expect(result).toContain('data-liteship-boundary=');
    expect(result).toContain('data-liteship-directive="adaptive"');
    expect(result.match(/data-liteship-boundary=/g)).toHaveLength(1);
  });

  test('replaces data-liteship names with serialized boundary payloads when resolution succeeds', async () => {
    const boundary = testBoundary();
    const resolveBoundary = vi.fn(async () => ({ primitive: boundary, source: '/test/boundaries.ts' }));
    const source = '<section data-liteship="hero"><slot /></section>';
    const result = await transformHTMLWithResolver(source, '/test/page.astro', '/test', undefined, resolveBoundary);

    expect(result).toContain("data-liteship-boundary='");
    expect(result).toContain(`"id":"${boundary.id}"`);
    expect(result).toContain('data-liteship-directive="adaptive"');
    expect(result).not.toContain('data-liteship="hero"');
  });

  test('passes the boundary dirs override through to primitive resolution', async () => {
    const boundary = testBoundary();
    const resolveSpy = vi.fn(async () => ({ primitive: boundary, source: '/test/defs/boundaries.ts' }));
    const source = '<section data-liteship="hero"></section>';
    await transformHTMLWithResolver(source, '/test/page.astro', '/test', '/test/defs', resolveSpy);

    expect(resolveSpy).toHaveBeenCalledWith('boundary', 'hero', '/test/page.astro', '/test', '/test/defs');
  });

  test('warns with doctor-style message when a boundary cannot be resolved', async () => {
    const resolveBoundary = vi.fn(async () => null);

    await captureDiagnosticsAsync(async ({ events }) => {
      const source = '<div data-liteship="hero"></div>';
      const result = await transformHTMLWithResolver(source, '/test/page.astro', '/test', undefined, resolveBoundary);
      const boundaryWarnings = events.filter((event) => event.code === 'boundary-not-found');

      expect(result).toBe(source);
      expect(boundaryWarnings).toHaveLength(1);
      expect(boundaryWarnings[0]?.message).toContain('Could not resolve boundary "hero"');
      expect(boundaryWarnings[0]?.message).toContain('defineBoundary');
      expect(boundaryWarnings[0]?.detail).toEqual(
        expect.objectContaining({ fromFile: '/test/page.astro', line: 1, boundaryName: 'hero' }),
      );
    });
  });

  test('plugin routes astro and html files through transformHTML before runtime injection', async () => {
    const root = makeTempDir();
    const src = join(root, 'src');
    mkdirSync(src, { recursive: true });
    const boundary = testBoundary();
    writeFileSync(join(src, 'boundaries.ts'), `export const hero = ${JSON.stringify(boundary)};\n`, 'utf8');

    const vitePlugin = plugin(undefined, () => null);
    vitePlugin.configResolved?.({ root, command: 'serve', base: '/' } as never);

    const astroResult = await vitePlugin.transform?.call(
      { warn: vi.fn() } as never,
      '<section data-liteship="hero" />',
      join(src, 'page.astro'),
    );
    const htmlResult = await vitePlugin.transform?.call(
      { warn: vi.fn() } as never,
      '<main data-liteship="hero" />',
      join(src, 'index.html'),
    );
    const jsResult = await vitePlugin.transform?.call({ warn: vi.fn() } as never, 'export {}', join(src, 'entry.ts'));

    expect(astroResult).toEqual(expect.objectContaining({ map: null }));
    expect(astroResult).toEqual(expect.objectContaining({ code: expect.stringContaining('data-liteship-boundary=') }));
    expect(htmlResult).toEqual(expect.objectContaining({ map: null }));
    expect(htmlResult).toEqual(expect.objectContaining({ code: expect.stringContaining('data-liteship-boundary=') }));
    expect(jsResult).toBeNull();
  });
});

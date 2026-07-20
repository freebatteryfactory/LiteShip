/**
 * HTML transform tests -- data-liteship="name" -> resolved boundary JSON.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  Diagnostics.reset();
});

describe('transformHTML', () => {
  test('returns source unchanged when no data-liteship attributes found', async () => {
    const { transformHTML } = await import('@liteship/vite/html-transform');
    const source = '<div class="foo">hello</div>';
    const result = await transformHTML(source, '/test/page.astro', '/test');
    expect(result).toBe(source);
  });

  test('does not modify data-liteship-boundary (already resolved)', async () => {
    const { transformHTML } = await import('@liteship/vite/html-transform');
    const source = '<div data-liteship-boundary=\'{"id":"hero"}\'></div>';
    const result = await transformHTML(source, '/test/page.astro', '/test');
    expect(result).toBe(source);
  });

  test('does not modify data-liteship-state or other data-liteship-* attrs', async () => {
    const { transformHTML } = await import('@liteship/vite/html-transform');
    const source = '<div data-liteship-state="mobile" data-liteship-stream-url="/api"></div>';
    const result = await transformHTML(source, '/test/page.astro', '/test');
    expect(result).toBe(source);
  });

  test('ignores data-liteship macros inside HTML comments and code samples', async () => {
    vi.doMock('../../../packages/vite/src/primitive-resolve.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        resolvePrimitive: vi.fn(async () => ({
          primitive: {
            id: 'viewport',
            input: 'viewport.width',
            thresholds: [0, 768],
            states: ['compact', 'wide'],
            hysteresis: 32,
          },
          source: '/test/boundaries.ts',
        })),
      };
    });

    const { transformHTML } = await import('@liteship/vite/html-transform');
    const commentLine = '<!-- teaching: data-liteship="viewport" is the macro label -->';
    const codeSample = '<pre><code>&lt;div data-liteship="viewport"&gt;</code></pre>';
    const live = '<div data-liteship="viewport"></div>';
    const source = [commentLine, codeSample, live].join('\n');
    const result = await transformHTML(source, '/test/page.astro', '/test');

    expect(result).toContain(commentLine);
    expect(result).toContain(codeSample);
    expect(result).toContain('data-liteship-boundary=');
    expect(result).toContain('data-liteship-directive="satellite"');
    expect(result.match(/data-liteship-boundary=/g)).toHaveLength(1);
  });

  test('replaces data-liteship names with serialized boundary payloads when resolution succeeds', async () => {
    vi.doMock('../../../packages/vite/src/primitive-resolve.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        resolvePrimitive: vi.fn(async () => ({
          primitive: {
            id: 'hero',
            input: 'viewport.width',
            thresholds: [0, 768],
            states: ['mobile', 'desktop'],
            hysteresis: 32,
          },
          source: '/test/boundaries.ts',
        })),
      };
    });

    const { transformHTML } = await import('@liteship/vite/html-transform');
    const source = '<section data-liteship="hero"><slot /></section>';
    const result = await transformHTML(source, '/test/page.astro', '/test');

    expect(result).toContain("data-liteship-boundary='");
    expect(result).toContain('"id":"hero"');
    expect(result).toContain('data-liteship-directive="satellite"');
    expect(result).not.toContain('data-liteship="hero"');
  });

  test('passes the boundary dirs override through to primitive resolution', async () => {
    const resolveSpy = vi.fn(async () => ({
      primitive: {
        id: 'hero',
        input: 'viewport.width',
        thresholds: [0, 768],
        states: ['mobile', 'desktop'],
        hysteresis: 32,
      },
      source: '/test/defs/boundaries.ts',
    }));
    vi.doMock('../../../packages/vite/src/primitive-resolve.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        resolvePrimitive: resolveSpy,
      };
    });

    const { transformHTML } = await import('@liteship/vite/html-transform');
    const source = '<section data-liteship="hero"></section>';
    await transformHTML(source, '/test/page.astro', '/test', '/test/defs');

    expect(resolveSpy).toHaveBeenCalledWith('boundary', 'hero', '/test/page.astro', '/test', '/test/defs');
  });

  test('warns with doctor-style message when a boundary cannot be resolved', async () => {
    vi.doMock('../../../packages/vite/src/primitive-resolve.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        resolvePrimitive: vi.fn(async () => null),
      };
    });

    await captureDiagnosticsAsync(async ({ events }) => {
      const { transformHTML } = await import('@liteship/vite/html-transform');
      const source = '<div data-liteship="hero"></div>';
      const result = await transformHTML(source, '/test/page.astro', '/test');
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
    const transformHTMLSpy = vi.fn(
      async (source: string, fromFile: string) => `${source}<!-- transformed:${fromFile} -->`,
    );
    vi.doMock('../../../packages/vite/src/html-transform.js', () => ({
      transformHTML: transformHTMLSpy,
    }));

    const { plugin } = await import('../../../packages/vite/src/plugin.js');
    const vitePlugin = plugin();
    vitePlugin.configResolved?.({ root: '/repo', command: 'serve' } as never);

    const astroResult = await vitePlugin.transform?.call(
      { warn: vi.fn() } as never,
      '<section />',
      '/repo/src/page.astro',
    );
    const htmlResult = await vitePlugin.transform?.call({ warn: vi.fn() } as never, '<main />', '/repo/src/index.html');
    const jsResult = await vitePlugin.transform?.call({ warn: vi.fn() } as never, 'export {}', '/repo/src/entry.ts');

    expect(transformHTMLSpy).toHaveBeenNthCalledWith(1, '<section />', '/repo/src/page.astro', '/repo', undefined);
    expect(transformHTMLSpy).toHaveBeenNthCalledWith(2, '<main />', '/repo/src/index.html', '/repo', undefined);
    expect(astroResult).toEqual({
      code: '<section /><!-- transformed:/repo/src/page.astro -->',
      map: null,
    });
    expect(htmlResult).toEqual({
      code: '<main /><!-- transformed:/repo/src/index.html -->',
      map: null,
    });
    expect(jsResult).toBeNull();
  });
});

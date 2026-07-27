/**
 * liteshipFetchLayer tests — the front-of-pipeline edge layer.
 *
 * Proves the layer shares ONE resolution path with liteshipMiddleware (resolution
 * parity), can serve boundary CSS and skip the downstream on the hot path, and
 * composes into Astro 7's `Fetchable` (`src/fetch.ts`) shape.
 */

import { describe, test, expect, vi } from 'vitest';
import { liteshipMiddleware, liteshipFetchLayer, serializeBoundaryCss } from '@liteship/astro';
import type { Fetchable } from 'astro';
import type { EdgeHostResolution } from '@liteship/edge';

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/', { headers: new Headers(headers) });
}

/** A downstream stub that ignores the request and returns a fixed Response. */
function nextOk(body = 'OK', status = 200): (request: Request) => Promise<Response> {
  return () => Promise.resolve(new Response(body, { status }));
}

/** A theme-only edge config — yields a non-empty `resolution.theme.css`. */
const themeEdge = { theme: () => ({ prefix: 'b', tokens: { color: 'x' } }) } as const;

describe('serializeBoundaryCss', () => {
  test('orders theme before the canonical compiled css payload (law 13 — emit only css)', () => {
    const payload = ['@property --p{}', '@container c (min-width:1px){}', '.x{color:red}'].join('\n\n');
    const resolution = {
      theme: { css: ':root{--a:1}' },
      compiledOutputs: {
        css: payload,
        propertyRegistrations: '@property --p{}',
        containerQueries: '@container c (min-width:1px){}',
      },
    } as unknown as EdgeHostResolution;

    const css = serializeBoundaryCss(resolution);
    expect(css).toBe([`:root{--a:1}`, payload].join('\n'));
    expect(css.match(/@property/g)).toHaveLength(1);
    expect(css.match(/@container/g)).toHaveLength(1);
  });

  test('does not prepend mirror fields when css is the sole payload (custom compile must fold into css)', () => {
    const resolution = {
      theme: { css: ':root{--a:1}' },
      compiledOutputs: {
        css: '.x{color:red}',
        propertyRegistrations: '@property --p{}',
        containerQueries: '@container c (min-width:1px){}',
      },
    } as unknown as EdgeHostResolution;

    expect(serializeBoundaryCss(resolution)).toBe([':root{--a:1}', '.x{color:red}'].join('\n'));
  });

  test('concatenates every boundary in the multi-boundary form', () => {
    const resolution = {
      boundaries: {
        a: { compiledOutputs: { css: '.a{}', propertyRegistrations: '', containerQueries: '' } },
        b: { compiledOutputs: { css: '.b{}', propertyRegistrations: '', containerQueries: '' } },
      },
    } as unknown as EdgeHostResolution;

    const css = serializeBoundaryCss(resolution);
    expect(css).toContain('.a{}');
    expect(css).toContain('.b{}');
  });

  test('does not append the same single named boundary through both resolution forms', () => {
    const compiled = { css: '.only{}', propertyRegistrations: '', containerQueries: '' };
    const resolution = {
      compiledOutputs: compiled,
      boundaries: { only: { compiledOutputs: compiled } },
    } as unknown as EdgeHostResolution;

    expect(serializeBoundaryCss(resolution)).toBe('.only{}');
  });
});

describe('liteshipFetchLayer', () => {
  test('is a layer factory', () => {
    expect(typeof liteshipFetchLayer()).toBe('function');
  });

  test('pass-through (default): runs the downstream and decorates Client-Hints headers', async () => {
    const layer = liteshipFetchLayer();
    const next = vi.fn(nextOk());
    const res = await layer(makeRequest({ 'sec-ch-viewport-width': '768' }), next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
    expect(await res.text()).toBe('OK');
  });

  test('edge serve: serves boundary CSS and never invokes the downstream', async () => {
    const layer = liteshipFetchLayer({ edge: themeEdge, serveFromEdge: () => true });
    const next = vi.fn(nextOk());
    const res = await layer(makeRequest(), next);

    expect(next).not.toHaveBeenCalled();
    expect(res.headers.get('content-type')).toContain('text/css');
    // The edge-serve response still asks the browser for hints next navigation.
    expect(res.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
    expect(typeof (await res.text())).toBe('string');
  });

  test('pass-through merges the responsive-media Vary axis even with detect OFF (F-RM-3)', async () => {
    // With detect off the client-hints Vary no longer advertises Save-Data / DPR, but a page can
    // still render `responsiveMedia()` output that varies by them — the merge must key it apart so
    // a CDN cannot serve the light srcset to a normal client (or vice versa) under one cache key.
    const res = await liteshipFetchLayer({ detect: false })(makeRequest(), nextOk());
    const vary = res.headers.get('Vary') ?? '';
    expect(vary).toContain('Save-Data');
    expect(vary).toContain('Sec-CH-DPR');
  });

  test('edge serve does NOT advertise the responsive-media Vary axis (boundary CSS carries no such output)', async () => {
    // Detect off, so the only way Save-Data could enter Vary is the responsive-media merge — which
    // the edge-serve CSS path must skip, keeping the boundary stylesheet cache-shared.
    const layer = liteshipFetchLayer({ detect: false, edge: themeEdge, serveFromEdge: () => true });
    const res = await layer(makeRequest(), nextOk());
    expect(res.headers.get('Vary') ?? '').not.toContain('Save-Data');
  });

  test('Vary parity: pass-through merges the SAME responsive-media axis as liteshipMiddleware', async () => {
    const mwRes = await liteshipMiddleware({ detect: false })({ request: makeRequest(), locals: {} }, nextOk());
    const layerRes = await liteshipFetchLayer({ detect: false })(makeRequest(), nextOk());
    expect(layerRes.headers.get('Vary')).toBe(mwRes.headers.get('Vary'));
  });

  test('resolution parity: same response headers as liteshipMiddleware for the same request', async () => {
    const headers = { 'sec-ch-viewport-width': '1280', 'sec-ch-device-memory': '8' };

    const mwRes = await liteshipMiddleware({ edge: themeEdge })({ request: makeRequest(headers), locals: {} }, nextOk());
    const layerRes = await liteshipFetchLayer({ edge: themeEdge })(makeRequest(headers), nextOk());

    expect(layerRes.headers.get('Accept-CH')).toBe(mwRes.headers.get('Accept-CH'));
    expect(layerRes.headers.get('Critical-CH')).toBe(mwRes.headers.get('Critical-CH'));
  });

  test('no-edge mode still applies the client-hints headers', async () => {
    const res = await liteshipFetchLayer()(makeRequest(), nextOk());
    expect(res.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
  });

  test('composes into a Fetchable (Astro 7 src/fetch.ts shape)', async () => {
    const layer = liteshipFetchLayer();
    const handler = {
      fetch: (request: Request) => layer(request, nextOk('astro')),
    } satisfies Fetchable;

    const res = await handler.fetch(makeRequest());
    expect(await res.text()).toBe('astro');
  });
});

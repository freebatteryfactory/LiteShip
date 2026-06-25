/**
 * czapFetchLayer tests — the front-of-pipeline edge layer.
 *
 * Proves the layer shares ONE resolution path with czapMiddleware (resolution
 * parity), can serve boundary CSS and skip the downstream on the hot path, and
 * composes into Astro 7's `Fetchable` (`src/fetch.ts`) shape.
 */

import { describe, test, expect, vi } from 'vitest';
import { czapMiddleware, czapFetchLayer, serializeBoundaryCss } from '@czap/astro';
import type { Fetchable } from 'astro';
import type { EdgeHostResolution } from '@czap/edge';

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
  test('orders theme → propertyRegistrations → containerQueries → css', () => {
    const resolution = {
      theme: { css: ':root{--a:1}' },
      compiledOutputs: {
        css: '.x{color:red}',
        propertyRegistrations: '@property --p{}',
        containerQueries: '@container c (min-width:1px){}',
      },
    } as unknown as EdgeHostResolution;

    const css = serializeBoundaryCss(resolution);
    expect(css.indexOf(':root')).toBeLessThan(css.indexOf('@property'));
    expect(css.indexOf('@property')).toBeLessThan(css.indexOf('@container'));
    expect(css.indexOf('@container')).toBeLessThan(css.indexOf('.x{color'));
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
});

describe('czapFetchLayer', () => {
  test('is a layer factory', () => {
    expect(typeof czapFetchLayer()).toBe('function');
  });

  test('pass-through (default): runs the downstream and decorates Client-Hints headers', async () => {
    const layer = czapFetchLayer();
    const next = vi.fn(nextOk());
    const res = await layer(makeRequest({ 'sec-ch-viewport-width': '768' }), next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
    expect(await res.text()).toBe('OK');
  });

  test('edge serve: serves boundary CSS and never invokes the downstream', async () => {
    const layer = czapFetchLayer({ edge: themeEdge, serveFromEdge: () => true });
    const next = vi.fn(nextOk());
    const res = await layer(makeRequest(), next);

    expect(next).not.toHaveBeenCalled();
    expect(res.headers.get('content-type')).toContain('text/css');
    // The edge-serve response still asks the browser for hints next navigation.
    expect(res.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
    expect(typeof (await res.text())).toBe('string');
  });

  test('resolution parity: same response headers as czapMiddleware for the same request', async () => {
    const headers = { 'sec-ch-viewport-width': '1280', 'sec-ch-device-memory': '8' };

    const mwRes = await czapMiddleware({ edge: themeEdge })({ request: makeRequest(headers), locals: {} }, nextOk());
    const layerRes = await czapFetchLayer({ edge: themeEdge })(makeRequest(headers), nextOk());

    expect(layerRes.headers.get('Accept-CH')).toBe(mwRes.headers.get('Accept-CH'));
    expect(layerRes.headers.get('Critical-CH')).toBe(mwRes.headers.get('Critical-CH'));
  });

  test('no-edge mode still applies the client-hints headers', async () => {
    const res = await czapFetchLayer()(makeRequest(), nextOk());
    expect(res.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
  });

  test('composes into a Fetchable (Astro 7 src/fetch.ts shape)', async () => {
    const layer = czapFetchLayer();
    const handler = {
      fetch: (request: Request) => layer(request, nextOk('astro')),
    } satisfies Fetchable;

    const res = await handler.fetch(makeRequest());
    expect(await res.text()).toBe('astro');
  });
});

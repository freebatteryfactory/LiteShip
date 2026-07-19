/**
 * Astro middleware tests -- Client Hints → tier detection → response headers.
 */

import { describe, test, expect } from 'vitest';
import { liteshipMiddleware } from '@liteship/astro';
import { onRequest as autoWiredOnRequest } from '../../../packages/astro/src/middleware-entry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(headers: Record<string, string> = {}): {
  request: Request;
  locals: Record<string, unknown>;
} {
  return {
    request: new Request('http://localhost/', {
      headers: new Headers(headers),
    }),
    locals: {},
  };
}

function makeNext(body = 'OK', status = 200): () => Promise<Response> {
  return () => Promise.resolve(new Response(body, { status }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('liteshipMiddleware', () => {
  test('creates a middleware function', () => {
    const middleware = liteshipMiddleware();
    expect(typeof middleware).toBe('function');
  });

  test('injects liteship locals with tier info', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext({
      'sec-ch-viewport-width': '768',
      'sec-ch-device-memory': '4',
    });

    await middleware(context, makeNext());

    const liteship = context.locals.liteship as Record<string, unknown>;
    expect(liteship).toBeDefined();
    expect(liteship.tiers).toBeDefined();
    expect(liteship.capabilities).toBeDefined();
  });

  test('sets Accept-CH response header', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext();

    const response = await middleware(context, makeNext());

    expect(response.headers.get('Accept-CH')).toBeTruthy();
    expect(response.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
  });

  test('sets Critical-CH response header including the viewport-width boot hint', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext();

    const response = await middleware(context, makeNext());

    expect(response.headers.get('Critical-CH')).toBeTruthy();
    // The production middleware must mark viewport-width critical so a cold browser
    // resends it before the first render — SSR boundary resolution reads it. (Regression
    // guard for the astro/edge Critical-CH drift; see critical-ch-drift.test.ts.)
    expect(response.headers.get('Critical-CH')).toContain('Sec-CH-Viewport-Width');
  });

  test('sets COOP and COEP headers when workers are enabled', async () => {
    const middleware = liteshipMiddleware({
      workers: { enabled: true },
    });
    const context = makeContext();

    const response = await middleware(context, makeNext());

    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  test('workers.coep selects the COEP value', async () => {
    const middleware = liteshipMiddleware({
      workers: { enabled: true, coep: 'credentialless' },
    });
    const context = makeContext();

    const response = await middleware(context, makeNext());

    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');
  });

  test('pre-existing COOP/COEP set by inner middleware win over liteship defaults', async () => {
    const middleware = liteshipMiddleware({
      workers: { enabled: true },
    });
    const context = makeContext();
    const next = (): Promise<Response> =>
      Promise.resolve(
        new Response('OK', {
          status: 200,
          headers: {
            'Cross-Origin-Embedder-Policy': 'credentialless',
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
          },
        }),
      );

    const response = await middleware(context, next);

    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
    // Client-hints headers remain liteship-owned and are still applied.
    expect(response.headers.get('Accept-CH')).toBeTruthy();
  });

  test('can disable client-hint headers while still preserving worker isolation headers', async () => {
    const middleware = liteshipMiddleware({
      detect: false,
      workers: { enabled: true },
    });
    const context = makeContext();

    const response = await middleware(context, makeNext());

    expect(response.headers.get('Accept-CH')).toBeNull();
    expect(response.headers.get('Critical-CH')).toBeNull();
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });

  test('preserves response status and body', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext();

    const response = await middleware(context, makeNext('Hello', 201));

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('Hello');
  });

  test('returns conservative tier for empty headers', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext();

    await middleware(context, makeNext());

    const liteship = context.locals.liteship as Record<string, unknown>;
    const tiers = liteship.tiers as Record<string, string>;
    expect(tiers.tier).toBeDefined();
    expect(tiers.motion).toBeDefined();
    expect(tiers.design).toBeDefined();
  });

  test('does not attach edge locals when no edge adapter is configured', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext();

    await middleware(context, makeNext());

    const liteship = context.locals.liteship as Record<string, unknown>;
    expect(liteship.edge).toBeUndefined();
  });

  test('detects reduced motion from client hints', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext({
      'sec-ch-prefers-reduced-motion': 'reduce',
    });

    await middleware(context, makeNext());

    const liteship = context.locals.liteship as Record<string, unknown>;
    const capabilities = liteship.capabilities as Record<string, unknown>;
    expect(capabilities.prefersReducedMotion).toBe(true);
  });

  test('uses the shared edge host adapter when configured', async () => {
    const cacheStore = new Map<string, string>();
    const middleware = liteshipMiddleware({
      edge: {
        theme: {
          prefix: 'brand',
          tokens: {
            'color.primary': '#ff5500',
          },
        },
        cache: {
          kv: {
            async get(key) {
              return cacheStore.get(key) ?? null;
            },
            async put(key, value) {
              cacheStore.set(key, value);
            },
          },
          boundaryId: 'fnv1a:astro-edge' as any,
          compile: () => ({
            css: '.cached{display:block;}',
            propertyRegistrations: '@property --cached {}',
            containerQueries: '@container cached {}',
          }),
        },
      },
    });
    const context = makeContext({
      'sec-ch-viewport-width': '1440',
      'sec-ch-device-memory': '8',
    });

    const response = await middleware(context, makeNext());
    const liteship = context.locals.liteship as Record<string, unknown>;
    const edge = liteship.edge as Record<string, unknown>;

    expect(edge.htmlAttributes).toContain('data-liteship-tier=');
    expect((edge.theme as Record<string, string>).css).toContain('--brand-color-primary');
    expect((edge.compiledOutputs as Record<string, string>).css).toContain('.cached');
    expect(edge.cacheStatus).toBe('miss');
    expect(response.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
  });
});

describe('auto-wired middleware entrypoint (addMiddleware target)', () => {
  test('exports a zero-config onRequest that populates Astro.locals.liteship', async () => {
    // The `./middleware-entry` module the integration registers via `addMiddleware`
    // — `onRequest = liteshipMiddleware()`. It must behave as the default zero-config
    // handler: Client Hints in, `locals.liteship` populated, response returned.
    expect(typeof autoWiredOnRequest).toBe('function');

    const context = makeContext({ 'sec-ch-viewport-width': '1440', 'sec-ch-device-memory': '8' });
    const response = await (autoWiredOnRequest as unknown as (c: typeof context, n: () => Promise<Response>) => Promise<Response>)(
      context,
      makeNext(),
    );

    expect(context.locals.liteship).toBeDefined();
    expect(response.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
  });
});

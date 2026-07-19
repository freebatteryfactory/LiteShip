/**
 * Responsive-media HOST path (#140) — no-mock, deterministic markup proof.
 *
 * The honest analogue of a browser network test: a real browser CANNOT fetch a
 * candidate that no output advertises, so if the SSR markup a production host emits
 * under Save-Data + high DPR never names a heavy candidate, the heavy asset can never
 * be fetched. This drives the ACTUAL production host wiring — `liteshipMiddleware`
 * (Astro) and `cloudflareMiddleware` (Cloudflare) — with real Client-Hint headers,
 * calls `locals.liteship.responsiveMedia(intent)` (the projector the middleware wires), and
 * asserts NO heavy candidate appears in src / srcset / <source> / preload / image-set,
 * plus that the responsive `Vary` axis is merged (not clobbered) into the response.
 *
 * No mock of `selectCandidates`, `ClientHints.responsiveMediaCapabilities`, or the
 * projection — the caps are derived from the request's real Client Hints. Deleting the
 * middleware wiring fails this test.
 */

import { describe, test, expect } from 'vitest';
import { Boundary, ResponsiveMedia, buildResponsiveImageSet, selectCandidates } from '@liteship/core';
import type { ResponsiveMediaIntent, ResponsiveMediaPictureProjection } from '@liteship/core';
import { liteshipMiddleware } from '@liteship/astro';
import { cloudflareMiddleware } from '@liteship/cloudflare';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HEAVY = ['hero-1600', 'hero-2400', 'hero-3200'];

function heroIntent(): ResponsiveMediaIntent {
  return ResponsiveMedia.intent({
    id: 'hero-img',
    alt: 'Hero photograph',
    variants: [
      { src: '/img/hero-800.jpg', width: 800 },
      { src: '/img/hero-1600.jpg', width: 1600 },
      { src: '/img/hero-2400.jpg', width: 2400 },
    ],
    saveDataVariant: { src: '/img/hero-lite.jpg', width: 400 },
    sizes: '(max-width: 768px) 100vw, 50vw',
  });
}

function noLiteIntent(): ResponsiveMediaIntent {
  return ResponsiveMedia.intent({
    id: 'hero-nolite',
    alt: 'x',
    variants: [
      { src: '/img/hero-800.jpg', width: 800 },
      { src: '/img/hero-1600.jpg', width: 1600 },
      { src: '/img/hero-2400.jpg', width: 2400 },
    ],
  });
}

function makeContext(headers: Record<string, string> = {}): {
  request: Request;
  locals: Record<string, unknown>;
} {
  return { request: new Request('http://localhost/', { headers: new Headers(headers) }), locals: {} };
}

/** next() that returns a response ALREADY carrying an app `Vary: Cookie` (the merge target). */
function nextWithVary(): () => Promise<Response> {
  return () => Promise.resolve(new Response('OK', { status: 200, headers: { Vary: 'Cookie' } }));
}

/** Read the projector the middleware injected into locals. */
function projector(context: {
  locals: Record<string, unknown>;
}): (i: ResponsiveMediaIntent) => ResponsiveMediaPictureProjection {
  const liteship = context.locals.liteship as {
    responsiveMedia?: (i: ResponsiveMediaIntent) => ResponsiveMediaPictureProjection;
  };
  expect(typeof liteship?.responsiveMedia).toBe('function');
  return liteship.responsiveMedia!;
}

/** Assert NO heavy candidate appears in ANY output artifact of a host projection. */
function expectNoHeavyAnywhere(projection: ResponsiveMediaPictureProjection, dpr: number): void {
  const imageSet = buildResponsiveImageSet(
    selectCandidates(heroIntent(), { devicePixelRatio: dpr, saveData: true }).candidates,
  );
  const surfaces = {
    picture: projection.picture,
    img: projection.img,
    srcset: projection.srcset,
    src: projection.resolved.src,
    preload: projection.preload,
    imageSet,
  };
  for (const [name, markup] of Object.entries(surfaces)) {
    for (const heavy of HEAVY) {
      expect(markup, `heavy candidate ${heavy} leaked into ${name} at DPR ${dpr}`).not.toContain(heavy);
    }
  }
}

// ── Astro host path ────────────────────────────────────────────────────────────

describe('Astro host path: liteshipMiddleware responsive-media projection (#140)', () => {
  test.each([1, 2, 3])('Save-Data + DPR %i advertises NO heavy candidate in any artifact', async (dpr) => {
    const middleware = liteshipMiddleware();
    const context = makeContext({ 'save-data': 'on', 'sec-ch-dpr': String(dpr) });
    await middleware(context, nextWithVary());

    const projection = projector(context)(heroIntent());
    expectNoHeavyAnywhere(projection, dpr);
    // The light asset IS served through the resolved src + srcset.
    expect(projection.resolved.src).toBe('/img/hero-lite.jpg');
    expect(projection.srcset).toBe('/img/hero-lite.jpg 400w');
  });

  test('Save-Data WITHOUT an authored light variant caps to the floor (no heavy, DPR 3)', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext({ 'save-data': 'on', 'sec-ch-dpr': '3' });
    await middleware(context, nextWithVary());

    const projection = projector(context)(noLiteIntent());
    expect(projection.resolved.src).toBe('/img/hero-800.jpg');
    for (const heavy of ['hero-1600', 'hero-2400']) {
      expect(projection.picture).not.toContain(heavy);
      expect(projection.srcset).not.toContain(heavy);
      expect(projection.preload).not.toContain(heavy);
    }
  });

  test('normal path is unchanged: a non-Save-Data client is advertised the FULL set', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext({ 'sec-ch-dpr': '2' });
    await middleware(context, nextWithVary());

    const projection = projector(context)(heroIntent());
    expect(projection.srcset).toContain('/img/hero-800.jpg 800w');
    expect(projection.srcset).toContain('/img/hero-1600.jpg 1600w');
    expect(projection.srcset).toContain('/img/hero-2400.jpg 2400w');
    expect(projection.resolved.src).toBe('/img/hero-1600.jpg');
  });

  test('the responsive Vary axis is MERGED into the response, never clobbering the app Vary', async () => {
    const middleware = liteshipMiddleware();
    const context = makeContext({ 'save-data': 'on', 'sec-ch-dpr': '3' });
    const response = await middleware(context, nextWithVary());

    const vary = response.headers.get('Vary') ?? '';
    const tokens = vary.split(',').map((t) => t.trim().toLowerCase());
    expect(tokens).toContain('cookie'); // pre-existing app axis survives
    expect(tokens).toContain('save-data'); // responsive-media axis added
    expect(tokens).toContain('sec-ch-dpr');
  });

  // F-RM-3: `responsiveMedia()` is on locals for EVERY request and projects from caps
  // parsed off the request's real Client Hints REGARDLESS of `detect`. A data-saver
  // browser sends `Save-Data` unprompted (never behind Accept-CH), so with detect OFF a
  // page rendering through the projector still emits a Save-Data-specific srcset — the
  // Vary axis MUST still be advertised or a CDN serves one variant under a shared key.
  test('advertises the responsive Vary axis even with detect DISABLED (Save-Data still varies output)', async () => {
    const middleware = liteshipMiddleware({ detect: false });
    const context = makeContext({ 'save-data': 'on' });
    const response = await middleware(context, nextWithVary());

    // Accept-CH is suppressed (detect off) but the output still varies by Save-Data...
    expect(response.headers.get('Accept-CH')).toBeNull();
    const projection = projector(context)(heroIntent());
    expect(projection.resolved.src).toBe('/img/hero-lite.jpg'); // Save-Data honored regardless

    // ...so the response MUST still Vary on that axis (union-merged with the app Vary).
    const tokens = (response.headers.get('Vary') ?? '').split(',').map((t) => t.trim().toLowerCase());
    expect(tokens).toContain('cookie');
    expect(tokens).toContain('save-data');
    expect(tokens).toContain('sec-ch-dpr');
  });
});

// ── Cloudflare host path ─────────────────────────────────────────────────────────

describe('Cloudflare host path: cloudflareMiddleware responsive-media projection (#140)', () => {
  function makeCfMiddleware() {
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    const cacheStore = new Map<string, string>();
    const kv = {
      async get(key: string) {
        return cacheStore.get(key) ?? null;
      },
      async put(key: string, value: string) {
        cacheStore.set(key, value);
      },
    };
    return cloudflareMiddleware({
      boundaryId: boundary.id,
      compile: async () => ({ css: 'x', propertyRegistrations: '', containerQueries: '' }),
      env: { LITESHIP_BOUNDARY_CACHE: kv },
    });
  }

  test.each([1, 2, 3])('Save-Data + DPR %i on the Workers edge advertises NO heavy candidate', async (dpr) => {
    const middleware = makeCfMiddleware();
    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({ 'save-data': 'on', 'sec-ch-dpr': String(dpr) }),
      }),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, () => Promise.resolve(new Response('ok', { headers: { Vary: 'Cookie' } })));

    const projection = projector(context)(heroIntent());
    expectNoHeavyAnywhere(projection, dpr);
    expect(projection.resolved.src).toBe('/img/hero-lite.jpg');
  });

  test('Workers edge merges the responsive Vary axis into the response', async () => {
    const middleware = makeCfMiddleware();
    const context = {
      request: new Request('http://localhost/', { headers: new Headers({ 'save-data': 'on', 'sec-ch-dpr': '3' }) }),
      locals: {} as Record<string, unknown>,
    };
    const response = await middleware(context, () =>
      Promise.resolve(new Response('ok', { headers: { Vary: 'Cookie' } })),
    );
    const tokens = (response.headers.get('Vary') ?? '').split(',').map((t) => t.trim().toLowerCase());
    expect(tokens).toContain('cookie');
    expect(tokens).toContain('save-data');
    expect(tokens).toContain('sec-ch-dpr');
  });
});

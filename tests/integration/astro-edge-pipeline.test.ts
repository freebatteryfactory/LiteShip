import { describe, expect, test } from 'vitest';
import { defineBoundary } from '@liteship/core';
import { liteshipMiddleware } from '@liteship/astro';

describe('Astro edge host pipeline integration', () => {
  test('resolves hints, tier, theme, and cached outputs through the middleware host path', async () => {
    const cacheStore = new Map<string, string>();
    // Real minted address -- the KV keyspace is content-addressed (ADR-0003),
    // so tests use defineBoundary ids rather than fabricated strings.
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    const middleware = liteshipMiddleware({
      edge: {
        theme: ({ tier }) => ({
          prefix: 'brand',
          tokens: {
            'color.primary': tier.designTier,
            'motion.mode': tier.motionTier,
          },
        }),
        cache: {
          kv: {
            async get(key) {
              return cacheStore.get(key) ?? null;
            },
            async put(key, value) {
              cacheStore.set(key, value);
            },
          },
          boundaryId: boundary.id,
          compile: ({ tier, theme }) => ({
            css: `${theme?.css ?? ''}\n[data-tier="${tier.designTier}"]{display:block;}`,
            propertyRegistrations: '@property --edge-tier {}',
            containerQueries: '@container edge-size {}',
          }),
        },
      },
    });

    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({
          'sec-ch-viewport-width': '1280',
          'sec-ch-device-memory': '8',
          'sec-ch-prefers-reduced-motion': 'reduce',
        }),
      }),
      locals: {} as Record<string, unknown>,
    };

    const response = await middleware(context, async () => {
      const liteship = context.locals.liteship as Record<string, any>;
      return new Response(
        JSON.stringify({
          tiers: liteship.tiers,
          edge: liteship.edge,
        }),
        { status: 200 },
      );
    });

    const body = JSON.parse(await response.text()) as {
      readonly tiers: { readonly motion: string };
      readonly edge: { readonly theme: { readonly css: string }; readonly compiledOutputs: { readonly css: string } };
    };

    expect(body.tiers.motion).toBe('none');
    expect(body.edge.theme.css).toContain('--brand-color-primary');
    expect(body.edge.compiledOutputs.css).toContain('[data-tier=');
    expect(response.headers.get('Accept-CH')).toContain('Sec-CH-Viewport-Width');
    expect(cacheStore.size).toBe(1);
  });
});

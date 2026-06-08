import { describe, expect, test } from 'vitest';
import { cloudflareMiddleware, setWorkersEnvForTesting, resetWorkersEnvForTesting } from '@czap/cloudflare';

describe('Cloudflare edge host pipeline integration', () => {
  test('cloudflareMiddleware wires KV cache through env binding', async () => {
    const cacheStore = new Map<string, string>();
    setWorkersEnvForTesting({
      CZAP_BOUNDARY_CACHE: {
        async get(key: string) {
          return cacheStore.get(key) ?? null;
        },
        async put(key: string, value: string) {
          cacheStore.set(key, value);
        },
      },
    });

    const middleware = cloudflareMiddleware({
      binding: 'CZAP_BOUNDARY_CACHE',
      boundaryId: 'fnv1a:integration-cloudflare' as never,
      compile: ({ tier }) => ({
        css: `[data-tier="${tier.designTier}"]{display:block;}`,
        propertyRegistrations: '',
        containerQueries: '',
      }),
      env: () => ({
        CZAP_BOUNDARY_CACHE: {
          async get(key: string) {
            return cacheStore.get(key) ?? null;
          },
          async put(key: string, value: string) {
            cacheStore.set(key, value);
          },
        },
      }),
    });

    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({
          'sec-ch-viewport-width': '1280',
          'sec-ch-device-memory': '8',
          'sec-ch-prefers-reduced-motion': 'no-preference',
        }),
      }),
      locals: {} as Record<string, unknown>,
    };

    const response = await middleware(context, async () => {
      const czap = context.locals.czap as Record<string, unknown>;
      return new Response(JSON.stringify({ edge: (czap as { edge?: unknown }).edge }), { status: 200 });
    });

    const body = JSON.parse(await response.text()) as {
      readonly edge: { readonly compiledOutputs: { readonly css: string }; readonly cacheStatus: string };
    };

    expect(body.edge.compiledOutputs.css).toContain('[data-tier=');
    expect(['hit', 'miss']).toContain(body.edge.cacheStatus);
    expect(cacheStore.size).toBe(1);
    resetWorkersEnvForTesting();
  });
});

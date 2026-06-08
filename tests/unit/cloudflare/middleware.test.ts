import { describe, expect, test, vi } from 'vitest';
import {
  cloudflareMiddleware,
  getDefaultWorkersEnv,
  resetWorkersEnvForTesting,
  setWorkersEnvForTesting,
} from '@czap/cloudflare';

describe('cloudflareMiddleware', () => {
  test('uses explicit env object without runtime priming', async () => {
    const cacheStore = new Map<string, string>();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      boundaryId: 'fnv1a:middleware-test' as never,
      compile: async () => ({ css: 'x', propertyRegistrations: '', containerQueries: '' }),
      env: {
        KV: {
          async get(key: string) {
            return cacheStore.get(key) ?? null;
          },
          async put(key: string, value: string) {
            cacheStore.set(key, value);
          },
        },
      },
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    const response = await middleware(context, async () => new Response('ok'));
    expect(response.status).toBe(200);
    expect((context.locals.czap as { edge?: { cacheStatus?: string } }).edge?.cacheStatus).toBeDefined();
  });

  test('env getter is invoked per KV operation', async () => {
    let calls = 0;
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      boundaryId: 'fnv1a:getter-test' as never,
      compile: async () => ({ css: '', propertyRegistrations: '', containerQueries: '' }),
      env: () => {
        calls++;
        return {
          KV: {
            async get() {
              return null;
            },
            async put() {},
          },
        };
      },
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));
    expect(calls).toBeGreaterThan(0);
  });

  test('primes workerd env on first request when env is omitted', async () => {
    resetWorkersEnvForTesting();
    setWorkersEnvForTesting({ CZAP_BOUNDARY_CACHE: { async get() { return null; }, async put() {} } });

    const middleware = cloudflareMiddleware({
      binding: 'CZAP_BOUNDARY_CACHE',
      boundaryId: 'fnv1a:prime-test' as never,
      compile: async () => ({ css: '', propertyRegistrations: '', containerQueries: '' }),
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));
    expect(getDefaultWorkersEnv().CZAP_BOUNDARY_CACHE).toBeDefined();
    resetWorkersEnvForTesting();
  });

  test('getDefaultWorkersEnv returns seeded test env', () => {
    resetWorkersEnvForTesting();
    setWorkersEnvForTesting({ seeded: true });
    expect(getDefaultWorkersEnv().seeded).toBe(true);
    resetWorkersEnvForTesting();
  });
});

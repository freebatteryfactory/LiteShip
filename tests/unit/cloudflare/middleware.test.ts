import { describe, expect, test } from 'vitest';
import { Boundary } from '@czap/core';
import { enumerateTierKeys } from '@czap/edge';
import type { BoundaryManifest, BoundaryManifestFile } from '@czap/edge';
import {
  cloudflareMiddleware,
  getDefaultWorkersEnv,
  resetWorkersEnvForTesting,
  setWorkersEnvForTesting,
} from '@czap/cloudflare';

/** Mint a real boundary so test ids honor the ADR-0003 identity law. */
function makeBoundary() {
  return Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'compact'],
      [768, 'wide'],
    ],
  });
}

/** Full tier-grid manifest around one boundary, like the build derives. */
function makeManifest(name = 'viewport'): { boundary: ReturnType<typeof makeBoundary>; manifest: BoundaryManifest } {
  const boundary = makeBoundary();
  const outputs = {
    css: '@container viewport-width (width >= 768px) {.czap-boundary {--gap: 24px;}}',
    propertyRegistrations: '',
    containerQueries: '@container viewport-width (width >= 768px) {.czap-boundary {--gap: 24px;}}',
  };
  const manifest: BoundaryManifest = {
    [name]: {
      id: boundary.id,
      outputsByTier: Object.fromEntries(enumerateTierKeys().map((key) => [key, outputs])),
    },
  };
  return { boundary, manifest };
}

function makeKVStore() {
  const cacheStore = new Map<string, string>();
  // Reads and writes are counted separately so "no KV traffic" tests can
  // prove zero get() calls, not just an empty store (which only proves
  // zero writes).
  const calls = { get: 0, put: 0 };
  const kv = {
    async get(key: string) {
      calls.get++;
      return cacheStore.get(key) ?? null;
    },
    async put(key: string, value: string) {
      calls.put++;
      cacheStore.set(key, value);
    },
  };
  return { cacheStore, kv, calls };
}

describe('cloudflareMiddleware', () => {
  test('uses explicit env object without runtime priming', async () => {
    const { kv } = makeKVStore();
    const boundary = makeBoundary();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      boundaryId: boundary.id,
      compile: async () => ({ css: 'x', propertyRegistrations: '', containerQueries: '' }),
      env: { KV: kv },
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
    const boundary = makeBoundary();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      boundaryId: boundary.id,
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

    const boundary = makeBoundary();
    const middleware = cloudflareMiddleware({
      binding: 'CZAP_BOUNDARY_CACHE',
      boundaryId: boundary.id,
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

  test('manifest path derives boundaryId and serves precompiled outputs without KV traffic', async () => {
    const { cacheStore, kv, calls } = makeKVStore();
    const { manifest } = makeManifest();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      manifest,
      boundary: 'viewport',
      env: { KV: kv },
    });

    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({ 'sec-ch-viewport-width': '1280', 'sec-ch-device-memory': '8' }),
      }),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));

    const edge = (context.locals.czap as { edge?: { cacheStatus?: string; compiledOutputs?: { css?: string } } }).edge;
    expect(edge?.cacheStatus).toBe('precompiled');
    expect(edge?.compiledOutputs?.css).toContain('@container');
    // "No KV traffic" means zero reads AND zero writes, not just an empty store.
    expect(calls.get).toBe(0);
    expect(calls.put).toBe(0);
    expect(cacheStore.size).toBe(0);
  });

  test('single-entry manifest needs no boundary selector', async () => {
    const { kv } = makeKVStore();
    const { manifest } = makeManifest();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      manifest,
      env: { KV: kv },
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));

    expect((context.locals.czap as { edge?: { cacheStatus?: string } }).edge?.cacheStatus).toBe('precompiled');
  });

  test('accepts the emitted czap-boundary-manifest.json envelope', async () => {
    const { kv } = makeKVStore();
    const { manifest } = makeManifest();
    const file: BoundaryManifestFile = { _tag: 'CzapBoundaryManifest', _version: 1, boundaries: manifest };
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      manifest: file,
      env: { KV: kv },
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));

    expect((context.locals.czap as { edge?: { cacheStatus?: string } }).edge?.cacheStatus).toBe('precompiled');
  });

  test('multi-boundary manifest without a selector throws a teaching error naming the candidates', () => {
    const { kv } = makeKVStore();
    const { manifest } = makeManifest();
    const second = makeManifest('sidebar');
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        manifest: { ...manifest, ...second.manifest },
        env: { KV: kv },
      }),
    ).toThrowError(/viewport.*sidebar|sidebar.*viewport/s);
  });

  test('unknown boundary name throws a teaching error listing what the manifest has', () => {
    const { kv } = makeKVStore();
    const { manifest } = makeManifest();
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        manifest,
        boundary: 'ghost',
        env: { KV: kv },
      }),
    ).toThrowError(/"ghost"[\s\S]*viewport/);
  });

  test('empty manifest throws a teaching error pointing at boundary modules', () => {
    const { kv } = makeKVStore();
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        manifest: {},
        env: { KV: kv },
      }),
    ).toThrowError(/boundaries\.ts/);
  });

  test('missing both manifest and complete escape hatch throws a teaching error', () => {
    const { kv } = makeKVStore();
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        env: { KV: kv },
      }),
    ).toThrowError(/virtual:czap\/boundaries/);
  });
});

import { afterEach, describe, expect, test } from 'vitest';
import { Diagnostics } from '@czap/core';
import { Boundary } from '@czap/core';
import { dedupeOutputsByTier, enumerateTierKeys } from '@czap/edge';
import type { BoundaryManifest, BoundaryManifestFile } from '@czap/edge';
import * as frontDoor from '@czap/cloudflare';
import { cloudflareMiddleware } from '@czap/cloudflare';
import * as testingEntry from '@czap/cloudflare/testing';
import { getDefaultWorkersEnv, resetWorkersEnvForTesting, setWorkersEnvForTesting } from '@czap/cloudflare/testing';

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
      // v2 deduped shape: one pooled output, every grid cell indexes it.
      outputs: [outputs],
      outputsByTier: Object.fromEntries(enumerateTierKeys().map((key) => [key, 0])),
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

afterEach(() => {
  Diagnostics.reset();
});

describe('testing-mutator partition (DX item #115)', () => {
  // LAW: the env-cache mutators are a footgun in production paths, so they must NOT
  // be reachable from the front door (`@czap/cloudflare`) — only from the partitioned
  // `@czap/cloudflare/testing` subpath. The documented production path stays the `env`
  // option on CloudflareMiddlewareConfig. Pin the partition, not a name count.
  const TEST_MUTATORS = ['setWorkersEnvForTesting', 'resetWorkersEnvForTesting', 'getDefaultWorkersEnv'] as const;

  for (const name of TEST_MUTATORS) {
    test(`'${name}' is exposed by /testing, not the front door`, () => {
      expect(testingEntry[name as keyof typeof testingEntry]).toBeTypeOf('function');
      expect((frontDoor as Record<string, unknown>)[name]).toBeUndefined();
    });
  }

  test('the front door still exposes the production surface', () => {
    expect(frontDoor.cloudflareMiddleware).toBeTypeOf('function');
    expect(frontDoor.createCloudflareEdgeCache).toBeTypeOf('function');
    expect(frontDoor.cloudflareAdapterCapsule).toBeDefined();
  });
});

describe('cloudflareMiddleware', () => {
  test('defaults binding to CZAP_BOUNDARY_CACHE when omitted', async () => {
    const { kv } = makeKVStore();
    const boundary = makeBoundary();
    const middleware = cloudflareMiddleware({
      boundaryId: boundary.id,
      compile: async () => ({ css: 'x', propertyRegistrations: '', containerQueries: '' }),
      env: { CZAP_BOUNDARY_CACHE: kv },
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));
    expect((context.locals.czap as { edge?: { cacheStatus?: string } }).edge?.cacheStatus).toBeDefined();
  });

  test('loadWorkersEnvFromRuntime warns when cloudflare:workers is unavailable', async () => {
    resetWorkersEnvForTesting();
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const boundary = makeBoundary();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      boundaryId: boundary.id,
      compile: async () => ({ css: '', propertyRegistrations: '', containerQueries: '' }),
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));

    expect(events.some((e) => e.code === 'workers-env-unavailable')).toBe(true);
    expect(events.find((e) => e.code === 'workers-env-unavailable')).toMatchObject({
      level: 'warn',
      source: 'czap/cloudflare.middleware',
    });
    resetWorkersEnvForTesting();
  });

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

  test('single-boundary tag config writes the boundary cache tag index on compile fallback', async () => {
    const { kv, cacheStore } = makeKVStore();
    const boundary = makeBoundary();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      boundaryId: boundary.id,
      tags: ['products'],
      compile: async () => ({ css: '.x{}', propertyRegistrations: '', containerQueries: '' }),
      env: { KV: kv },
    });

    await middleware({ request: new Request('http://localhost/'), locals: {} }, async () => new Response('ok'));

    expect(cacheStore.get('czap:tag:products')).toContain(boundary.id);
  });

  test('manifest tag map attaches tags to the named boundary compile fallback', async () => {
    const { kv, cacheStore } = makeKVStore();
    const boundary = makeBoundary();
    const manifest: BoundaryManifest = {
      hero: { id: boundary.id, outputs: [], outputsByTier: {} },
    };
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      manifest,
      tags: { hero: ['hero-route'] },
      compile: async () => ({ css: '.hero{}', propertyRegistrations: '', containerQueries: '' }),
      env: { KV: kv },
    });

    await middleware({ request: new Request('http://localhost/'), locals: {} }, async () => new Response('ok'));

    expect(cacheStore.get('czap:tag:hero-route')).toContain(boundary.id);
  });

  test('per-boundary tag maps require a manifest name or a default entry', () => {
    const { kv } = makeKVStore();
    const boundary = makeBoundary();
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        boundaryId: boundary.id,
        tags: { hero: ['products'] },
        compile: async () => ({ css: '.x{}', propertyRegistrations: '', containerQueries: '' }),
        env: { KV: kv },
      }),
    ).toThrowError(/per-boundary `tags` map/);
  });

  test('primes workerd env on first request when env is omitted', async () => {
    resetWorkersEnvForTesting();
    setWorkersEnvForTesting({
      CZAP_BOUNDARY_CACHE: {
        async get() {
          return null;
        },
        async put() {},
      },
    });

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
    const file: BoundaryManifestFile = { _tag: 'CzapBoundaryManifest', _version: 2, boundaries: manifest };
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

  /**
   * Two-boundary manifest with distinct content (distinct content
   * addresses) and distinct CSS -- the cross-poisoning fixture.
   */
  function makeMultiManifest(): BoundaryManifest {
    const viewport = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'wide'],
      ],
    });
    const sidebar = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'collapsed'],
        [1024, 'expanded'],
      ],
    });
    // v2 deduped entries, like the build derives (pool + index cells).
    const grid = (css: string) =>
      dedupeOutputsByTier(
        Object.fromEntries(
          enumerateTierKeys().map((key) => [key, { css, propertyRegistrations: '', containerQueries: '' }]),
        ),
      );
    return {
      viewport: { id: viewport.id, ...grid('.viewport{--gap:24px;}') },
      sidebar: { id: sidebar.id, ...grid('.sidebar{--gap:8px;}') },
    };
  }

  test('multi-boundary manifest without a selector serves every boundary with its own CSS', async () => {
    const { kv } = makeKVStore();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      manifest: makeMultiManifest(),
      env: { KV: kv },
    });

    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({ 'sec-ch-viewport-width': '1280', 'sec-ch-device-memory': '8' }),
      }),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));

    const edge = (
      context.locals.czap as {
        edge?: {
          compiledOutputs?: unknown;
          boundaries?: Record<string, { compiledOutputs?: { css?: string }; cacheStatus?: string }>;
        };
      }
    ).edge;
    // The regression this guards: two boundaries at the same tier must not
    // bleed into each other's cached CSS.
    expect(edge?.boundaries?.viewport?.compiledOutputs?.css).toBe('.viewport{--gap:24px;}');
    expect(edge?.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{--gap:8px;}');
    expect(edge?.boundaries?.viewport?.cacheStatus).toBe('precompiled');
    expect(edge?.boundaries?.sidebar?.cacheStatus).toBe('precompiled');
    expect(edge?.compiledOutputs).toBeUndefined();
  });

  test('boundary list narrows a multi-boundary manifest', async () => {
    const { kv } = makeKVStore();
    const middleware = cloudflareMiddleware({
      binding: 'KV',
      manifest: makeMultiManifest(),
      boundary: ['sidebar'],
      env: { KV: kv },
    });

    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    await middleware(context, async () => new Response('ok'));

    const edge = (
      context.locals.czap as {
        edge?: { boundaries?: Record<string, { compiledOutputs?: { css?: string } }> };
      }
    ).edge;
    expect(edge?.boundaries?.sidebar?.compiledOutputs?.css).toBe('.sidebar{--gap:8px;}');
    expect(edge?.boundaries?.viewport).toBeUndefined();
  });

  test('empty boundary list throws a teaching error naming the manifest boundaries', () => {
    const { kv } = makeKVStore();
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        manifest: makeMultiManifest(),
        boundary: [],
        env: { KV: kv },
      }),
    ).toThrowError(/viewport.*sidebar|sidebar.*viewport/s);
  });

  test('unknown name in a boundary list throws the teaching error listing what the manifest has', () => {
    const { kv } = makeKVStore();
    expect(() =>
      cloudflareMiddleware({
        binding: 'KV',
        manifest: makeMultiManifest(),
        boundary: ['viewport', 'ghost'],
        env: { KV: kv },
      }),
    ).toThrowError(/"ghost"[\s\S]*viewport/);
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

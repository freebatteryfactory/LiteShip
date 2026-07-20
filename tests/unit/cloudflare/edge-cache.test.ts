import { afterEach, describe, it, expect, vi } from 'vitest';
import { Diagnostics, defineBoundary } from '@liteship/core';
import { createBoundaryCache, EdgeTier } from '@liteship/edge';
import { createCloudflareEdgeCache, resolveKvBinding } from '@liteship/cloudflare';

afterEach(() => {
  Diagnostics.reset();
});

describe('createCloudflareEdgeCache', () => {
  it('resolves KV get/put through a binding name', async () => {
    const store = new Map<string, string>();
    const env = {
      LITESHIP_BOUNDARY_CACHE: {
        async get(key: string) {
          return store.get(key) ?? null;
        },
        async put(key: string, value: string) {
          store.set(key, value);
        },
      },
    };
    const kv = createCloudflareEdgeCache(() => env, { binding: 'LITESHIP_BOUNDARY_CACHE' });
    await kv.put('k1', 'v1');
    expect(await kv.get('k1')).toBe('v1');
    expect(await kv.get('missing')).toBeNull();
  });

  it('returns null when binding is absent', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const kv = createCloudflareEdgeCache(() => ({}), { binding: 'MISSING' });
    expect(await kv.get('k')).toBeNull();
    await kv.put('k', 'v');
    expect(await kv.get('k')).toBeNull();
    expect(events).toEqual([
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/cloudflare.edge-cache',
        code: 'kv-binding-missing',
        message: expect.stringContaining('MISSING'),
      }),
    ]);
    expect(events[0]?.message).toContain('wrangler.jsonc');
  });

  it('lists available bindings when KV binding is missing', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const kv = createCloudflareEdgeCache(() => ({ OTHER: { get: async () => null, put: async () => {} } }), {
      binding: 'LITESHIP_BOUNDARY_CACHE',
    });
    await kv.get('k');
    expect(events[0]?.message).toContain('available: OTHER');
  });

  it('forwards delete/list through active boundary invalidation', async () => {
    const store = new Map<string, string>();
    const env = {
      KV: {
        async get(key: string) {
          return store.get(key) ?? null;
        },
        async put(key: string, value: string) {
          store.set(key, value);
        },
        async delete(key: string) {
          store.delete(key);
        },
        async list({ prefix }: { prefix: string }) {
          return {
            keys: [...store.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
            list_complete: true,
          };
        },
      },
    };
    const boundary = defineBoundary({ input: 'viewport.width', at: [[0, 'compact']] });
    const tier = EdgeTier.detectTier(new Headers({ 'sec-ch-viewport-width': '1280' }));
    const cache = createBoundaryCache(createCloudflareEdgeCache(() => env, { binding: 'KV' }));

    await cache.putCompiledOutputs(boundary.id, tier, { css: '.x{}', propertyRegistrations: '', containerQueries: '' });

    expect(await cache.invalidateByPath(boundary.id)).toBe(1);
    expect(store.size).toBe(0);
  });

  it('purges Cache API L1 entries when active invalidation deletes a KV key', async () => {
    const store = new Map<string, string>();
    const cacheApi = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => true),
    };
    const env = {
      KV: {
        async get(key: string) {
          return store.get(key) ?? null;
        },
        async put(key: string, value: string) {
          store.set(key, value);
        },
        async delete(key: string) {
          store.delete(key);
        },
        async list({ prefix }: { prefix: string }) {
          return {
            keys: [...store.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
            list_complete: true,
          };
        },
      },
    };
    const boundary = defineBoundary({ input: 'viewport.width', at: [[0, 'compact']] });
    const tier = EdgeTier.detectTier(new Headers({ 'sec-ch-viewport-width': '1280' }));
    const boundaryCache = createBoundaryCache(createCloudflareEdgeCache(() => env, { binding: 'KV', cache: cacheApi }));

    await boundaryCache.putCompiledOutputs(boundary.id, tier, {
      css: '.x{}',
      propertyRegistrations: '',
      containerQueries: '',
    });
    await boundaryCache.invalidateByPath(boundary.id);

    expect(cacheApi.delete).toHaveBeenCalledTimes(1);
    expect(cacheApi.delete.mock.calls[0]?.[0]).toBeInstanceOf(Request);
  });

  it('serves a Cache API L1 hit without reading KV', async () => {
    let kvReads = 0;
    const cache = {
      match: vi.fn(async () => new Response('from-cache')),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => true),
    };
    const kv = createCloudflareEdgeCache(
      () => ({
        KV: {
          async get() {
            kvReads++;
            return 'from-kv';
          },
          async put() {},
        },
      }),
      { binding: 'KV', cache },
    );

    await expect(kv.get('k')).resolves.toBe('from-cache');
    expect(kvReads).toBe(0);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('reads KV with cacheTtl and populates Cache API L1 through waitUntil on a miss', async () => {
    const pending: Promise<unknown>[] = [];
    let seenOptions: unknown;
    const cache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async (_request: Request, response: Response) => {
        expect(await response.text()).toBe('from-kv');
      }),
      delete: vi.fn(async () => true),
    };
    const ctx = {
      waitUntil: vi.fn((promise: Promise<unknown>) => {
        pending.push(promise);
      }),
    };
    const kv = createCloudflareEdgeCache(
      () => ({
        KV: {
          async get(_key: string, options?: { cacheTtl?: number }) {
            seenOptions = options;
            return 'from-kv';
          },
          async put() {},
        },
      }),
      { binding: 'KV', cache, ctx, cacheTtl: 120 },
    );

    await expect(kv.get('k')).resolves.toBe('from-kv');
    expect(seenOptions).toEqual({ cacheTtl: 120 });
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    await Promise.all(pending);
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it('degrades to KV when Cache API or ctx is absent', async () => {
    const cache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => {}),
      delete: vi.fn(async () => true),
    };
    const kv = createCloudflareEdgeCache(
      () => ({
        KV: {
          async get() {
            return 'from-kv';
          },
          async put() {},
        },
      }),
      { binding: 'KV', cache },
    );

    await expect(kv.get('k')).resolves.toBe('from-kv');
    expect(cache.match).toHaveBeenCalledTimes(1);
    expect(cache.put).not.toHaveBeenCalled();

    const noCache = createCloudflareEdgeCache(
      () => ({
        KV: {
          async get() {
            return 'from-kv';
          },
          async put() {},
        },
      }),
      { binding: 'KV', cache: null },
    );
    await expect(noCache.get('k')).resolves.toBe('from-kv');
  });

  it('does not mask missing delete/list capabilities on custom KV-shaped bindings', async () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const store = new Map<string, string>();
    const kv = createCloudflareEdgeCache(
      () => ({
        KV: {
          async get(key: string) {
            return store.get(key) ?? null;
          },
          async put(key: string, value: string) {
            store.set(key, value);
          },
        },
      }),
      { binding: 'KV' },
    );

    expect(kv.delete).toBeUndefined();
    expect(kv.list).toBeUndefined();
    expect(events.some((event) => event.code === 'kv-binding-capability-missing')).toBe(true);
  });
});

describe('resolveKvBinding', () => {
  it('accepts a KVNamespace-shaped object', () => {
    const kv = { get: async () => null, put: async () => {} };
    expect(resolveKvBinding({ B: kv }, 'B')).toBe(kv);
  });

  it('rejects non-KV values', () => {
    expect(resolveKvBinding({ B: 'nope' }, 'B')).toBeNull();
  });
});

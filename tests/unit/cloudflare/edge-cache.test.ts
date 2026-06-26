import { afterEach, describe, it, expect } from 'vitest';
import { Boundary, Diagnostics } from '@czap/core';
import { createBoundaryCache, EdgeTier } from '@czap/edge';
import { createCloudflareEdgeCache, resolveKvBinding } from '@czap/cloudflare';

afterEach(() => {
  Diagnostics.reset();
});

describe('createCloudflareEdgeCache', () => {
  it('resolves KV get/put through a binding name', async () => {
    const store = new Map<string, string>();
    const env = {
      CZAP_BOUNDARY_CACHE: {
        async get(key: string) {
          return store.get(key) ?? null;
        },
        async put(key: string, value: string) {
          store.set(key, value);
        },
      },
    };
    const kv = createCloudflareEdgeCache(() => env, { binding: 'CZAP_BOUNDARY_CACHE' });
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
        source: 'czap/cloudflare.edge-cache',
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
      binding: 'CZAP_BOUNDARY_CACHE',
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
    const boundary = Boundary.make({ input: 'viewport.width', at: [[0, 'compact']] });
    const tier = EdgeTier.detectTier(new Headers({ 'sec-ch-viewport-width': '1280' }));
    const cache = createBoundaryCache(createCloudflareEdgeCache(() => env, { binding: 'KV' }));

    await cache.putCompiledOutputs(boundary.id, tier, { css: '.x{}', propertyRegistrations: '', containerQueries: '' });

    expect(await cache.invalidateByPath(boundary.id)).toBe(1);
    expect(store.size).toBe(0);
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

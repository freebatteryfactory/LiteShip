import { afterEach, describe, it, expect } from 'vitest';
import { Diagnostics } from '@czap/core';
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

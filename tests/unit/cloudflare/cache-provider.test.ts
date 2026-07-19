import { afterEach, describe, expect, test } from 'vitest';
import { Boundary, Diagnostics } from '@liteship/core';
import { createBoundaryCache, EdgeTier, type KVNamespace } from '@liteship/edge';
import {
  astroPathTag,
  cloudflareCacheProvider,
  collectAstroInvalidationTags,
  createCloudflareCacheProvider,
} from '../../../packages/cloudflare/src/cache-provider.js';

afterEach(() => {
  Diagnostics.reset();
});

function makeKV(): { store: Map<string, string>; kv: KVNamespace } {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      async get(key) {
        return store.get(key) ?? null;
      },
      async put(key, value) {
        store.set(key, value);
      },
      async delete(key) {
        store.delete(key);
      },
      async list({ prefix, cursor }) {
        const all = [...store.keys()].filter((key) => key.startsWith(prefix)).sort();
        const start = cursor ? Number(cursor) : 0;
        const slice = all.slice(start, start + 1);
        const next = start + slice.length;
        return {
          keys: slice.map((name) => ({ name })),
          list_complete: next >= all.length,
          ...(next >= all.length ? {} : { cursor: String(next) }),
        };
      },
    },
  };
}

const boundary = Boundary.make({ input: 'viewport.width', at: [[0, 'compact']] });
const tier = EdgeTier.detectTier(new Headers({ 'sec-ch-viewport-width': '1280' }));
const outputs = { css: '.x{}', propertyRegistrations: '', containerQueries: '' };

describe('@liteship/cloudflare/cache-provider', () => {
  test('config helper returns an Astro CacheProviderConfig entrypoint', () => {
    expect(cloudflareCacheProvider({ binding: 'KV', prefix: 'app' })).toEqual({
      entrypoint: '@liteship/cloudflare/cache-provider',
      config: { binding: 'KV', prefix: 'app' },
    });
  });

  test('collects explicit tags and Astro path tags', () => {
    expect(astroPathTag('/products')).toBe('astro-path:/products');
    expect(collectAstroInvalidationTags({ tags: ['products'], path: '/products' })).toEqual([
      'products',
      'astro-path:/products',
    ]);
  });

  test('invalidate({ tags }) purges boundary entries tagged in the shared KV index', async () => {
    const { kv, store } = makeKV();
    const cache = createBoundaryCache(kv, { prefix: 'app' });
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, undefined, ['products']);
    expect(store.size).toBe(2);

    const provider = createCloudflareCacheProvider({ binding: 'KV', prefix: 'app', env: { KV: kv } });
    await provider.invalidate({ tags: 'products' });

    expect([...store.keys()].some((key) => key.includes(boundary.id))).toBe(false);
    expect(store.has('app:tag:products')).toBe(false);
  });

  test('invalidate({ path }) purges path tags and configured boundary ids', async () => {
    const { kv, store } = makeKV();
    const cache = createBoundaryCache(kv, { prefix: 'app' });
    await cache.putCompiledOutputs(boundary.id, tier, outputs);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, 'path-tagged', undefined, [astroPathTag('/products')]);

    const provider = createCloudflareCacheProvider({
      binding: 'KV',
      prefix: 'app',
      env: { KV: kv },
      pathBoundaries: { '/products': boundary.id },
    });
    await provider.invalidate({ path: '/products' });

    expect([...store.keys()].filter((key) => key.includes(boundary.id))).toHaveLength(0);
  });

  test('setHeaders exposes route tags, the path tag, and Cloudflare cache-control directives', () => {
    const provider = createCloudflareCacheProvider({ env: { KV: makeKV().kv } });
    const headers = provider.setHeaders?.(
      { tags: ['products'], maxAge: 300, swr: 60 },
      new Request('https://example.com/products'),
    );
    expect(headers?.get('Cache-Tag')).toBe('products,astro-path:/products');
    expect(headers?.get('Cloudflare-CDN-Cache-Control')).toBe('max-age=300, stale-while-revalidate=60');
  });

  test('path invalidation without a path map still purges the path tag and warns', async () => {
    const { kv, store } = makeKV();
    const cache = createBoundaryCache(kv);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, undefined, [astroPathTag('/products')]);
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const provider = createCloudflareCacheProvider({ env: { LITESHIP_BOUNDARY_CACHE: kv } });
    await provider.invalidate({ path: '/products' });

    expect([...store.keys()].some((key) => key.includes(boundary.id))).toBe(false);
    expect(events.some((event) => event.code === 'path-boundary-map-missing')).toBe(true);
  });
});

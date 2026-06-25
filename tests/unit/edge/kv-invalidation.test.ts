/**
 * BoundaryCache active invalidation — invalidateByPath / invalidateByTag.
 *
 * Closes ADR-0017's one honest gap: the content-addressed keyspace previously
 * relied on passive TTL-orphaning. These prove the active purge works against a
 * Cloudflare-shaped KV (get/put/delete/list, paginated) and degrades cleanly to
 * a diagnostic + 0 on a KV that omits delete/list.
 */

import { describe, test, expect, afterEach } from 'vitest';
import { Boundary, Diagnostics } from '@czap/core';
import { createBoundaryCache, EdgeTier, type KVNamespace } from '@czap/edge';

afterEach(() => {
  Diagnostics.reset();
});

const boundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});
const tier = EdgeTier.detectTier(new Headers({ 'sec-ch-viewport-width': '1280' }));
const outputs = { css: '.x{}', propertyRegistrations: '', containerQueries: '' };

/** Full Cloudflare-shaped KV: get/put/delete/list with prefix scan + (optional) paging. */
function makeKV(pageSize = Infinity): { store: Map<string, string>; kv: KVNamespace } {
  const store = new Map<string, string>();
  const kv: KVNamespace = {
    get: (k) => Promise.resolve(store.get(k) ?? null),
    put: async (k, v) => void store.set(k, v),
    delete: async (k) => void store.delete(k),
    list: ({ prefix, cursor }) => {
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const slice = Number.isFinite(pageSize) ? all.slice(start, start + pageSize) : all;
      const end = start + slice.length;
      const complete = end >= all.length;
      return Promise.resolve({
        keys: slice.map((name) => ({ name })),
        list_complete: complete,
        ...(complete ? {} : { cursor: String(end) }),
      });
    },
  };
  return { store, kv };
}

/** A KV that only implements get/put (no active invalidation possible). */
function makeGetPutKV(): { store: Map<string, string>; kv: KVNamespace } {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      get: (k) => Promise.resolve(store.get(k) ?? null),
      put: async (k, v) => void store.set(k, v),
    },
  };
}

describe('invalidateByPath (active purge by content address)', () => {
  test('deletes every tier/theme variant of one boundary and returns the count', async () => {
    const { store, kv } = makeKV();
    const cache = createBoundaryCache(kv);

    await cache.putCompiledOutputs(boundary.id, tier, outputs);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'themeA');
    await cache.putCompiledOutputs(boundary.id, tier, outputs, 'named', 'themeB');
    expect(store.size).toBe(3);

    const deleted = await cache.invalidateByPath(boundary.id);
    expect(deleted).toBe(3);
    expect(store.size).toBe(0);
    expect(await cache.getCompiledOutputs(boundary.id, tier)).toBeNull();
  });

  test('follows list pagination to completion', async () => {
    const { kv } = makeKV(1); // one key per page — forces the cursor loop
    const cache = createBoundaryCache(kv);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'a');
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'b');
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'c');

    expect(await cache.invalidateByPath(boundary.id)).toBe(3);
  });

  test('degrades to a diagnostic + 0 when the KV cannot list/delete', async () => {
    const { kv } = makeGetPutKV();
    const cache = createBoundaryCache(kv);
    const buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);

    await cache.putCompiledOutputs(boundary.id, tier, outputs);
    expect(await cache.invalidateByPath(boundary.id)).toBe(0);
    expect(buffer.events.some((e) => e.code === 'invalidation-unsupported')).toBe(true);
  });
});

describe('invalidateByTag (Astro.cache tag parity)', () => {
  test('purges every key written under a tag and clears the index', async () => {
    const { store, kv } = makeKV();
    const cache = createBoundaryCache(kv);

    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'themeA', ['products']);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'themeB', ['products']);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'themeC', ['other']);

    const deleted = await cache.invalidateByTag('products');
    expect(deleted).toBe(2);
    // The 'other'-tagged entry survives; the products index is gone.
    expect([...store.keys()].some((k) => k.includes(':tag:products'))).toBe(false);
    expect([...store.keys()].some((k) => k.includes(':tag:other'))).toBe(true);
  });

  test('the tag index does not double-count a re-put key', async () => {
    const { kv } = makeKV();
    const cache = createBoundaryCache(kv);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'themeA', ['t']);
    await cache.putCompiledOutputs(boundary.id, tier, outputs, undefined, 'themeA', ['t']); // same key
    expect(await cache.invalidateByTag('t')).toBe(1);
  });

  test('degrades to a diagnostic + 0 when the KV cannot delete', async () => {
    const { kv } = makeGetPutKV();
    const cache = createBoundaryCache(kv);
    const buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);

    expect(await cache.invalidateByTag('anything')).toBe(0);
    expect(buffer.events.some((e) => e.code === 'invalidation-unsupported')).toBe(true);
  });
});

/**
 * Maps a Cloudflare Workers env binding to the {@link @czap/edge} KVNamespace shape.
 *
 * @module
 */

import type { KVNamespace } from '@czap/edge';
import { Diagnostics } from '@czap/core';

/** Cloudflare Workers execution environment (bindings bag). */
export type CloudflareWorkersEnv = Record<string, unknown>;

export interface CloudflareEdgeCacheOptions {
  /** KV namespace binding name (e.g. `CZAP_BOUNDARY_CACHE`). */
  readonly binding: string;
  /** Workers ExecutionContext; enables background Cache API population on KV hits. */
  readonly ctx?: { waitUntil(promise: Promise<unknown>): void };
  /** Cloudflare KV edge-cache TTL, passed through to `kv.get(key, { cacheTtl })`. */
  readonly cacheTtl?: number;
  /** Cache API implementation. Defaults to `globalThis.caches.default` when present. */
  readonly cache?: CloudflareCacheApi | null;
}

export interface CloudflareCacheApi {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/**
 * Resolve a KV namespace from a Workers env bag by binding name.
 */
export function resolveKvBinding(env: CloudflareWorkersEnv, binding: string): KVNamespace | null {
  const candidate = env[binding];
  if (
    candidate !== null &&
    candidate !== undefined &&
    typeof candidate === 'object' &&
    'get' in candidate &&
    'put' in candidate &&
    typeof (candidate as KVNamespace).get === 'function' &&
    typeof (candidate as KVNamespace).put === 'function'
  ) {
    return candidate as KVNamespace;
  }
  return null;
}

function warnMissingBinding(envSource: () => CloudflareWorkersEnv, binding: string): void {
  const available = Object.keys(envSource());
  Diagnostics.warnOnce({
    source: 'czap/cloudflare.edge-cache',
    code: 'kv-binding-missing',
    message:
      `KV binding "${binding}" is not present in the Workers env` +
      (available.length > 0 ? ` (available: ${available.join(', ')})` : ' (no bindings found)') +
      `. Fix: add a kv_namespaces entry with binding "${binding}" in wrangler.jsonc.`,
  });
}

function warnMissingCapability(binding: string, capability: 'delete' | 'list'): void {
  Diagnostics.warnOnce({
    source: 'czap/cloudflare.edge-cache',
    code: 'kv-binding-capability-missing',
    message:
      `KV binding "${binding}" does not implement ${capability}(), so active cache invalidation cannot use it. ` +
      'Cloudflare Workers KV implements get/put/delete/list; custom test doubles and KV adapters must expose the same methods.',
  });
}

function resolveDefaultCache(): CloudflareCacheApi | null {
  const candidate = (globalThis as { caches?: { default?: CloudflareCacheApi } }).caches?.default;
  return candidate ?? null;
}

function cacheRequest(binding: string, key: string): Request {
  return new Request(`https://czap.invalid/${encodeURIComponent(binding)}/${encodeURIComponent(key)}`);
}

function kvGetOptions(cacheTtl: number | undefined): { cacheTtl: number } | undefined {
  return cacheTtl === undefined ? undefined : { cacheTtl };
}

/**
 * Create a lazy {@link KVNamespace} adapter backed by a Workers env binding.
 *
 * The env source is invoked on each operation so per-request env timing on
 * workerd is respected when the caller passes a fresh getter.
 */
export function createCloudflareEdgeCache(
  envSource: () => CloudflareWorkersEnv,
  options: CloudflareEdgeCacheOptions,
): KVNamespace {
  const edgeCache = options.cache === undefined ? resolveDefaultCache() : options.cache;
  return {
    async get(key: string): Promise<string | null> {
      const request = edgeCache ? cacheRequest(options.binding, key) : null;
      if (edgeCache && request) {
        const matched = await edgeCache.match(request);
        if (matched) return matched.text();
      }

      const kv = resolveKvBinding(envSource(), options.binding);
      if (!kv) {
        warnMissingBinding(envSource, options.binding);
        return null;
      }
      const value = await kv.get(key, kvGetOptions(options.cacheTtl));
      if (value !== null && edgeCache && request && options.ctx) {
        options.ctx.waitUntil(edgeCache.put(request, new Response(value)));
      }
      return value;
    },
    async put(key: string, value: string, putOptions?: { expirationTtl?: number }): Promise<void> {
      const kv = resolveKvBinding(envSource(), options.binding);
      if (!kv) {
        warnMissingBinding(envSource, options.binding);
        return;
      }
      await kv.put(key, value, putOptions);
    },
    // Workers KV implements delete/list, so expose them only when the live
    // binding really has them. This keeps @czap/edge's capability checks honest
    // for tests/custom adapters while still allowing late-bound workerd env.
    get delete() {
      const current = resolveKvBinding(envSource(), options.binding);
      if (!current) {
        warnMissingBinding(envSource, options.binding);
        return undefined;
      }
      if (typeof current.delete !== 'function') {
        warnMissingCapability(options.binding, 'delete');
        return undefined;
      }
      return async (key: string): Promise<void> => {
        const kv = resolveKvBinding(envSource(), options.binding);
        if (!kv) {
          warnMissingBinding(envSource, options.binding);
          return;
        }
        if (typeof kv.delete !== 'function') {
          warnMissingCapability(options.binding, 'delete');
          return;
        }
        await kv.delete(key);
      };
    },
    get list() {
      const current = resolveKvBinding(envSource(), options.binding);
      if (!current) {
        warnMissingBinding(envSource, options.binding);
        return undefined;
      }
      if (typeof current.list !== 'function') {
        warnMissingCapability(options.binding, 'list');
        return undefined;
      }
      return async (listOptions: { prefix: string; cursor?: string }) => {
        const kv = resolveKvBinding(envSource(), options.binding);
        if (!kv) {
          warnMissingBinding(envSource, options.binding);
          return { keys: [], list_complete: true };
        }
        if (typeof kv.list !== 'function') {
          warnMissingCapability(options.binding, 'list');
          return { keys: [], list_complete: true };
        }
        return kv.list(listOptions);
      };
    },
  };
}

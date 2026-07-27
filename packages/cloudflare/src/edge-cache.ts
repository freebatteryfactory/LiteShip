/**
 * Maps a Cloudflare Workers env binding to the {@link @liteship/edge} KVNamespace shape.
 *
 * @module
 */

import type { KVNamespace } from '@liteship/edge';
import { Diagnostics } from '@liteship/core';

/** Cloudflare Workers execution environment (bindings bag). */
export type CloudflareWorkersEnv = Record<string, unknown>;

/** Per-request Cloudflare Workers lifetime authority. */
export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/** Request-scoped options for constructing a Cloudflare edge cache. */
export interface CloudflareEdgeCacheOptions {
  /** KV namespace binding name (e.g. `LITESHIP_BOUNDARY_CACHE`). */
  readonly binding: string;
  /** Cloudflare KV edge-cache TTL, passed through to `kv.get(key, { cacheTtl })`. */
  readonly cacheTtl?: number;
  /** Cache API implementation. Defaults to `globalThis.caches.default` when present. */
  readonly cache?: CloudflareCacheApi | null;
}

/** Minimal Cloudflare Cache API capability consumed by the edge cache. */
export interface CloudflareCacheApi {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
  delete?(request: Request): Promise<boolean>;
}

function warnInvalidBinding(binding: string, cause: unknown): void {
  Diagnostics.warnOnce({
    source: 'liteship/cloudflare.edge-cache',
    code: 'kv-binding-invalid',
    message:
      `KV binding "${binding}" could not be inspected and was refused. ` +
      'Workers KV bindings must expose callable get() and put() methods; inspect the attached host error.',
    cause,
  });
}

/**
 * Resolve a KV namespace from a Workers env bag by binding name.
 */
export function resolveKvBinding(env: CloudflareWorkersEnv, binding: string): KVNamespace | null {
  const candidate = env[binding];
  if (candidate !== null && candidate !== undefined && typeof candidate === 'object') {
    try {
      if (typeof Reflect.get(candidate, 'get') === 'function' && typeof Reflect.get(candidate, 'put') === 'function') {
        return candidate as KVNamespace;
      }
    } catch (cause) {
      warnInvalidBinding(binding, cause);
      return null;
    }
  }
  return null;
}

function warnMissingBinding(env: CloudflareWorkersEnv, binding: string): void {
  const available = Object.keys(env);
  Diagnostics.warnOnce({
    source: 'liteship/cloudflare.edge-cache',
    code: 'kv-binding-missing',
    message:
      `KV binding "${binding}" is not present in the Workers env` +
      (available.length > 0 ? ` (available: ${available.join(', ')})` : ' (no bindings found)') +
      `. Fix: add a kv_namespaces entry with binding "${binding}" in wrangler.jsonc.`,
  });
}

function warnCacheApiFailure(operation: 'read' | 'write', binding: string, cause: unknown): void {
  Diagnostics.warnOnce({
    source: 'liteship/cloudflare.edge-cache',
    code: `cache-api-${operation}-failed`,
    message:
      `Cloudflare Cache API ${operation} failed for KV binding "${binding}" and was bypassed. ` +
      'Workers KV remains the authoritative cache source; inspect the attached cause and the host Cache API implementation.',
    cause,
  });
}

function warnMissingCapability(binding: string, capability: 'delete' | 'list'): void {
  Diagnostics.warnOnce({
    source: 'liteship/cloudflare.edge-cache',
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
  return new Request(`https://liteship.invalid/${encodeURIComponent(binding)}/${encodeURIComponent(key)}`);
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
  requestContext?: CloudflareExecutionContext,
): KVNamespace {
  const edgeCache = options.cache === undefined ? resolveDefaultCache() : options.cache;
  return {
    async get(key: string): Promise<string | null> {
      const request = edgeCache ? cacheRequest(options.binding, key) : null;
      if (edgeCache && request) {
        try {
          const matched = await edgeCache.match(request);
          if (matched) return await matched.text();
        } catch (cause) {
          warnCacheApiFailure('read', options.binding, cause);
        }
      }

      const env = envSource();
      const kv = resolveKvBinding(env, options.binding);
      if (!kv) {
        warnMissingBinding(env, options.binding);
        return null;
      }
      const value = await kv.get(key, kvGetOptions(options.cacheTtl));
      if (value !== null && edgeCache && request && requestContext) {
        requestContext.waitUntil(
          edgeCache.put(request, new Response(value)).catch((cause: unknown) => {
            warnCacheApiFailure('write', options.binding, cause);
          }),
        );
      }
      return value;
    },
    async put(key: string, value: string, putOptions?: { expirationTtl?: number }): Promise<void> {
      const env = envSource();
      const kv = resolveKvBinding(env, options.binding);
      if (!kv) {
        warnMissingBinding(env, options.binding);
        return;
      }
      await kv.put(key, value, putOptions);
      // Cache API is a read-through projection, never a second authority. A KV
      // mutation invalidates the matching L1 entry before any subsequent read,
      // preventing stale tag-index read/modify/write and under-purge.
      if (edgeCache && typeof edgeCache.delete === 'function') {
        await edgeCache.delete(cacheRequest(options.binding, key));
      }
    },
    // Workers KV implements delete/list, so expose them only when the live
    // binding really has them. This keeps @liteship/edge's capability checks honest
    // for tests/custom adapters while still allowing late-bound workerd env.
    get delete() {
      const env = envSource();
      const current = resolveKvBinding(env, options.binding);
      if (!current) {
        warnMissingBinding(env, options.binding);
        return undefined;
      }
      if (typeof current.delete !== 'function') {
        warnMissingCapability(options.binding, 'delete');
        return undefined;
      }
      return async (key: string): Promise<void> => {
        const env = envSource();
        const kv = resolveKvBinding(env, options.binding);
        if (!kv) {
          warnMissingBinding(env, options.binding);
          return;
        }
        if (typeof kv.delete !== 'function') {
          warnMissingCapability(options.binding, 'delete');
          return;
        }
        await kv.delete(key);
        if (edgeCache && typeof edgeCache.delete === 'function') {
          await edgeCache.delete(cacheRequest(options.binding, key));
        }
      };
    },
    get list() {
      const env = envSource();
      const current = resolveKvBinding(env, options.binding);
      if (!current) {
        warnMissingBinding(env, options.binding);
        return undefined;
      }
      if (typeof current.list !== 'function') {
        warnMissingCapability(options.binding, 'list');
        return undefined;
      }
      return async (listOptions: { prefix: string; cursor?: string }) => {
        const env = envSource();
        const kv = resolveKvBinding(env, options.binding);
        if (!kv) {
          warnMissingBinding(env, options.binding);
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

/**
 * Maps a Cloudflare Workers env binding to the {@link @czap/edge} KVNamespace shape.
 *
 * @module
 */

import type { KVNamespace } from '@czap/edge';

/** Cloudflare Workers execution environment (bindings bag). */
export type CloudflareWorkersEnv = Record<string, unknown>;

export interface CloudflareEdgeCacheOptions {
  /** KV namespace binding name (e.g. `CZAP_BOUNDARY_CACHE`). */
  readonly binding: string;
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
  return {
    async get(key: string): Promise<string | null> {
      const kv = resolveKvBinding(envSource(), options.binding);
      if (!kv) return null;
      return kv.get(key);
    },
    async put(key: string, value: string, putOptions?: { expirationTtl?: number }): Promise<void> {
      const kv = resolveKvBinding(envSource(), options.binding);
      if (!kv) return;
      await kv.put(key, value, putOptions);
    },
  };
}

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
      if (!kv) {
        warnMissingBinding(envSource, options.binding);
        return null;
      }
      return kv.get(key);
    },
    async put(key: string, value: string, putOptions?: { expirationTtl?: number }): Promise<void> {
      const kv = resolveKvBinding(envSource(), options.binding);
      if (!kv) {
        warnMissingBinding(envSource, options.binding);
        return;
      }
      await kv.put(key, value, putOptions);
    },
  };
}

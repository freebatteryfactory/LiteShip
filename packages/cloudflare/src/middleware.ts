/**
 * Cloudflare Workers middleware glue for {@link @czap/astro} edge resolution.
 *
 * @module
 */

import type { ContentAddress } from '@czap/core';
import type { EdgeHostAdapterConfig, EdgeHostCacheConfig } from '@czap/edge';
import { czapMiddleware } from '@czap/astro';
import { createCloudflareEdgeCache, type CloudflareWorkersEnv } from './edge-cache.js';

export interface CloudflareMiddlewareConfig {
  /** KV namespace binding name in wrangler.jsonc. */
  readonly binding: string;
  /** Content address of the boundary whose compiled outputs are cached. */
  readonly boundaryId: ContentAddress;
  /** Compile function invoked on KV cache miss. */
  readonly compile: EdgeHostCacheConfig['compile'];
  /** Optional theme config or per-request resolver. */
  readonly theme?: EdgeHostAdapterConfig['theme'];
  /**
   * Cache entry TTL in seconds — an eviction/cost knob, not a freshness
   * knob. Compiled outputs are content-addressed and never go stale; each
   * deploy that changes boundary content mints a new `ContentAddress`,
   * orphaning the old `boundaryId` x tier keys. Workers KV has no eviction
   * and bills storage, so set a TTL (e.g. `2592000` = 30 days) to reclaim
   * keys for superseded builds. Omit to cache indefinitely.
   */
  readonly ttl?: number;
  /** Optional KV key prefix. */
  readonly prefix?: string;
  /** Whether to parse Client Hints (default `true`). */
  readonly detect?: boolean;
  /** Whether to emit COOP/COEP for `client:worker`. */
  readonly workers?: { readonly enabled?: boolean };
  /**
   * Override the Workers env source. Default reads `env` from `cloudflare:workers`.
   * Pass a getter in tests or when env is injected by the host framework.
   */
  readonly env?: CloudflareWorkersEnv | (() => CloudflareWorkersEnv);
}

let cachedWorkersEnv: CloudflareWorkersEnv | undefined;

/** Read the workerd execution env (lazy, once per isolate). */
export function getDefaultWorkersEnv(): CloudflareWorkersEnv {
  return cachedWorkersEnv ?? {};
}

/**
 * Seed the default Workers env (for unit tests or custom hosts).
 */
export function setWorkersEnvForTesting(env: CloudflareWorkersEnv): void {
  cachedWorkersEnv = env;
}

/**
 * Reset cached env between tests.
 */
export function resetWorkersEnvForTesting(): void {
  cachedWorkersEnv = undefined;
}

/** Load env from the workerd runtime module when available. */
export async function loadWorkersEnvFromRuntime(): Promise<CloudflareWorkersEnv> {
  if (cachedWorkersEnv) return cachedWorkersEnv;
  try {
    const mod = await import('cloudflare:workers');
    cachedWorkersEnv = mod.env as CloudflareWorkersEnv;
    return cachedWorkersEnv;
  } catch {
    return getDefaultWorkersEnv();
  }
}

function resolveEnvSource(config: CloudflareMiddlewareConfig): () => CloudflareWorkersEnv {
  if (typeof config.env === 'function') return config.env;
  if (config.env) return () => config.env as CloudflareWorkersEnv;
  return () => getDefaultWorkersEnv();
}

/**
 * Astro middleware factory wired for Cloudflare Workers KV boundary caching.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { cloudflareMiddleware } from '@czap/cloudflare';
 * export const onRequest = cloudflareMiddleware({
 *   binding: 'CZAP_BOUNDARY_CACHE',
 *   boundaryId: 'sha256:…',
 *   compile: async () => ({ css: '', propertyRegistrations: [], containerQueries: [] }),
 * });
 * ```
 */
export function cloudflareMiddleware(config: CloudflareMiddlewareConfig): ReturnType<typeof czapMiddleware> {
  const envSource = resolveEnvSource(config);
  const kv = createCloudflareEdgeCache(envSource, { binding: config.binding });
  const inner = czapMiddleware({
    edge: {
      cache: {
        kv,
        boundaryId: config.boundaryId,
        compile: config.compile,
        ttl: config.ttl,
        prefix: config.prefix,
      },
      theme: config.theme,
    },
    detect: config.detect,
    workers: config.workers,
  });

  if (config.env) return inner;

  let envPrimed = false;
  const wrapped = async (
    context: Parameters<ReturnType<typeof czapMiddleware>>[0],
    next: Parameters<ReturnType<typeof czapMiddleware>>[1],
  ) => {
    if (!envPrimed) {
      await loadWorkersEnvFromRuntime();
      envPrimed = true;
    }
    return inner(context, next);
  };
  return wrapped as ReturnType<typeof czapMiddleware>;
}

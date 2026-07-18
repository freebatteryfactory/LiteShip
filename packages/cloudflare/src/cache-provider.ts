/**
 * Astro 7 cache provider bridge for CZAP's Cloudflare KV boundary cache.
 *
 * The file is both the Astro config helper (`cloudflareCacheProvider()`) and
 * the runtime provider entrypoint, following Astro's cache provider contract.
 *
 * @module
 */

import { Diagnostics, type ContentAddress } from '@czap/core';
import { createBoundaryCache } from '@czap/edge';
import { createCloudflareEdgeCache, type CloudflareWorkersEnv } from './edge-cache.js';
import { loadWorkersEnvFromRuntime, resolveEnvSource } from './env-source.js';

/** Structural mirror of Astro's `CacheProviderConfig`. */
export interface AstroCacheProviderConfig {
  readonly entrypoint: string | URL;
  readonly config?: Record<string, unknown>;
}

/** Structural mirror of Astro's `InvalidateOptions`. */
export interface AstroInvalidateOptions {
  readonly path?: string;
  readonly tags?: string | readonly string[];
}

/** Minimal structural cache directives Astro passes to provider.setHeaders(). */
interface AstroCacheHeaderOptions {
  readonly tags?: readonly string[];
  readonly maxAge?: number;
  readonly swr?: number | boolean;
}

/** Minimal structural cache-provider shape consumed by Astro 7. */
export interface AstroCacheProvider {
  readonly name: string;
  setHeaders?(options: AstroCacheHeaderOptions, request: Request): Headers;
  invalidate(options: AstroInvalidateOptions): Promise<void>;
}

export interface CloudflareCacheProviderOptions {
  /** KV namespace binding name in wrangler.jsonc. Defaults to `CZAP_BOUNDARY_CACHE`. */
  readonly binding?: string;
  /** KV key prefix shared with `cloudflareMiddleware({ prefix })`. Defaults to `czap`. */
  readonly prefix?: string;
  /**
   * Optional exact route path → boundary id mapping for native path invalidation.
   * Path invalidation also purges the Astro path tag (`astro-path:/x`) so hosts
   * may choose tag propagation instead of maintaining this map.
   */
  readonly pathBoundaries?: Readonly<Record<string, ContentAddress | readonly ContentAddress[]>>;
}

interface RuntimeOptions extends CloudflareCacheProviderOptions {
  readonly env?: CloudflareWorkersEnv | (() => CloudflareWorkersEnv);
}

function normalizeTags(tags: string | readonly string[] | undefined): readonly string[] {
  if (tags === undefined) return [];
  return typeof tags === 'string' ? [tags] : tags;
}

function normalizePath(path: string): string {
  try {
    return new URL(path).pathname;
  } catch {
    return path.startsWith('/') ? path : `/${path}`;
  }
}

/** Astro's documented path-tag convention for providers that purge paths via tags. */
export function astroPathTag(path: string): string {
  return `astro-path:${normalizePath(path)}`;
}

/** Collect explicit tags plus the path-derived tag used by Astro cache providers. */
export function collectAstroInvalidationTags(options: AstroInvalidateOptions): readonly string[] {
  const tags = new Set(normalizeTags(options.tags).filter((tag) => tag.length > 0));
  if (options.path !== undefined) tags.add(astroPathTag(options.path));
  return [...tags];
}

function normalizeBoundaryIds(
  value: ContentAddress | readonly ContentAddress[] | undefined,
): readonly ContentAddress[] {
  if (value === undefined) return [];
  return typeof value === 'string' ? [value] : value;
}

function cacheControlValue(options: AstroCacheHeaderOptions): string | null {
  const parts: string[] = [];
  if (typeof options.maxAge === 'number' && Number.isFinite(options.maxAge) && options.maxAge >= 0) {
    parts.push(`max-age=${Math.floor(options.maxAge)}`);
  }
  if (typeof options.swr === 'number' && Number.isFinite(options.swr) && options.swr > 0) {
    parts.push(`stale-while-revalidate=${Math.floor(options.swr)}`);
  } else if (options.swr === true && typeof options.maxAge === 'number' && options.maxAge > 0) {
    parts.push(`stale-while-revalidate=${Math.floor(options.maxAge)}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Astro config helper. Use in `astro.config.mjs`:
 *
 * ```ts
 * cache: { provider: cloudflareCacheProvider({ binding: 'CZAP_BOUNDARY_CACHE' }) }
 * ```
 */
export function cloudflareCacheProvider(options: CloudflareCacheProviderOptions = {}): AstroCacheProviderConfig {
  return {
    entrypoint: '@czap/cloudflare/cache-provider',
    config: { ...options },
  };
}

/** Build the runtime provider object Astro loads from the configured entrypoint. */
export function createCloudflareCacheProvider(options: RuntimeOptions = {}): AstroCacheProvider {
  const binding = options.binding ?? 'CZAP_BOUNDARY_CACHE';
  const envSource = resolveEnvSource(options);
  const kv = createCloudflareEdgeCache(envSource, { binding });
  const boundaryCache = createBoundaryCache(kv, { prefix: options.prefix });

  return {
    name: '@czap/cloudflare',
    setHeaders(cacheOptions, request) {
      const headers = new Headers();
      const tags = new Set(cacheOptions.tags ?? []);
      tags.add(astroPathTag(new URL(request.url).pathname));
      if (tags.size > 0) headers.set('Cache-Tag', [...tags].join(','));
      const cacheControl = cacheControlValue(cacheOptions);
      if (cacheControl !== null) headers.set('Cloudflare-CDN-Cache-Control', cacheControl);
      return headers;
    },
    async invalidate(invalidateOptions) {
      if (options.env === undefined) await loadWorkersEnvFromRuntime();
      const tags = collectAstroInvalidationTags(invalidateOptions);
      for (const tag of tags) {
        await boundaryCache.invalidateByTag(tag);
      }

      if (invalidateOptions.path === undefined) return;
      const path = normalizePath(invalidateOptions.path);
      const boundaryIds = normalizeBoundaryIds(options.pathBoundaries?.[path]);
      if (boundaryIds.length === 0) {
        Diagnostics.warnOnce({
          source: 'czap/cloudflare.cache-provider',
          code: 'path-boundary-map-missing',
          message:
            `cache.invalidate({ path: "${path}" }) had no pathBoundaries entry. ` +
            `Purged tag "${astroPathTag(path)}"; add pathBoundaries when native boundary-id purging is needed.`,
        });
        return;
      }
      for (const boundaryId of boundaryIds) {
        await boundaryCache.invalidateByPath(boundaryId);
      }
    },
  };
}

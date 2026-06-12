/**
 * Content-addressed boundary precomputation cache with a generic KV
 * interface -- not coupled to any specific KV provider (Cloudflare,
 * Deno KV, Vercel KV, etc.).
 *
 * Cache keys encode the boundary content address and the two-axis tier
 * result so each tier combination gets its own cached compilation output.
 *
 * @module
 */

import { Diagnostics, type ContentAddress } from '@czap/core';
import type { EdgeTierResult } from './edge-tier.js';
import { tierKey } from './manifest.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal KV namespace interface -- compatible with Cloudflare Workers KV,
 * Deno KV, or any adapter that implements get/put with string values.
 */
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Precompiled CSS outputs for a single boundary at a given tier.
 */
export interface CompiledOutputs {
  readonly css: string;
  readonly propertyRegistrations: string;
  readonly containerQueries: string;
}

/**
 * Content-addressed cache for boundary compilation results keyed by
 * tier combination.
 */
export interface BoundaryCache {
  /**
   * `qualifier` joins the key when two NAMES share one boundary
   * `ContentAddress` but carry different compiled CSS (the same
   * `Boundary.make` definition referenced by two `@quantize` blocks) —
   * without it, the first name's compile result would serve every name.
   */
  getCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: EdgeTierResult,
    qualifier?: string,
  ): Promise<CompiledOutputs | null>;

  putCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: EdgeTierResult,
    outputs: CompiledOutputs,
    qualifier?: string,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface CacheOptions {
  /**
   * Cache entry TTL in seconds. This is an eviction/cost knob, not a
   * freshness knob: entries are content-addressed and never go stale, but
   * each deploy that changes boundary content mints a new `ContentAddress`,
   * orphaning the old `boundaryId` x tier keys — and Workers KV never
   * evicts on its own and bills storage. Set a TTL to garbage-collect
   * entries for superseded boundary builds and bound KV storage cost.
   * Omit to cache indefinitely.
   */
  readonly ttl?: number;
  readonly prefix?: string;
}

function buildCacheKey(
  prefix: string,
  boundaryId: ContentAddress,
  tierResult: EdgeTierResult,
  qualifier?: string,
): string {
  // Tier portion shares `tierKey` with manifest lookups so the KV keyspace
  // and the precompiled-manifest keyspace can never disagree. The qualifier
  // (boundary NAME in multi-boundary configs) segregates same-id boundaries
  // whose CSS differs; unqualified single-boundary keys are unchanged.
  return qualifier === undefined
    ? `${prefix}:boundary:${boundaryId}:${tierKey(tierResult)}`
    : `${prefix}:boundary:${boundaryId}:${qualifier}:${tierKey(tierResult)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a {@link BoundaryCache} backed by the provided KV namespace.
 *
 * Cache keys encode the boundary content address and the two-axis tier
 * result so each tier combination gets its own cached compilation output.
 *
 * @example
 * ```ts
 * import { KVCache, EdgeTier } from '@czap/edge';
 * import { Boundary } from '@czap/core';
 *
 * const kv = { get: async (k: string) => null, put: async (k: string, v: string) => {} };
 * const cache = KVCache.createBoundaryCache(kv, { ttl: 3600, prefix: 'myapp' });
 *
 * const myBoundary = Boundary.make({
 *   input: 'viewport.width',
 *   at: [[0, 'compact'], [768, 'wide']],
 * });
 * const request = new Request('https://example.com', {
 *   headers: { 'device-memory': '8', 'sec-ch-viewport-width': '1280' },
 * });
 * const tierResult = EdgeTier.detectTier(request.headers);
 *
 * // Store compiled outputs
 * await cache.putCompiledOutputs(myBoundary.id, tierResult, {
 *   css: '...',
 *   propertyRegistrations: '...',
 *   containerQueries: '...',
 * });
 *
 * // Retrieve cached outputs
 * const cached = await cache.getCompiledOutputs(myBoundary.id, tierResult);
 * ```
 *
 * @param kv      - A generic KV namespace implementing get/put
 * @param options - Optional TTL (seconds) and key prefix configuration
 * @returns A {@link BoundaryCache} instance
 */
export function createBoundaryCache(kv: KVNamespace, options?: CacheOptions): BoundaryCache {
  const prefix = options?.prefix ?? 'czap';
  const ttl = options?.ttl;

  return {
    async getCompiledOutputs(
      boundaryId: ContentAddress,
      tierResult: EdgeTierResult,
      qualifier?: string,
    ): Promise<CompiledOutputs | null> {
      const key = buildCacheKey(prefix, boundaryId, tierResult, qualifier);
      const raw = await kv.get(key);
      if (raw === null) return null;

      let parsed: unknown;
      let invalidJson = false;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        if (error instanceof SyntaxError) {
          invalidJson = true;
          Diagnostics.warnOnce({
            source: 'czap/edge.kv-cache',
            code: 'invalid-cache-entry',
            message:
              `Boundary cache entry "${key}" could not be parsed and will be treated as a cache miss. ` +
              'Probable cause: a foreign writer or truncated value wrote this key. ' +
              'If a compile callback is configured, the host adapter will recompile and overwrite automatically — no action needed.',
            cause: error,
          });
        } else {
          throw error;
        }
      }

      if (invalidJson) {
        return null;
      }

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'css' in parsed &&
        'propertyRegistrations' in parsed &&
        'containerQueries' in parsed
      ) {
        return {
          css: String(parsed.css),
          propertyRegistrations: String(parsed.propertyRegistrations),
          containerQueries: String(parsed.containerQueries),
        };
      }

      Diagnostics.warnOnce({
        source: 'czap/edge.kv-cache',
        code: 'cache-entry-shape-mismatch',
        message:
          `Boundary cache entry "${key}" parsed as JSON but is missing css, propertyRegistrations, or containerQueries and will be treated as a cache miss. ` +
          'Probable cause: a foreign writer or an older cache schema wrote this key. ' +
          'If a compile callback is configured, the host adapter will recompile and overwrite automatically — no action needed.',
      });

      return null;
    },

    async putCompiledOutputs(
      boundaryId: ContentAddress,
      tierResult: EdgeTierResult,
      outputs: CompiledOutputs,
      qualifier?: string,
    ): Promise<void> {
      const key = buildCacheKey(prefix, boundaryId, tierResult, qualifier);
      const value = JSON.stringify({
        css: outputs.css,
        propertyRegistrations: outputs.propertyRegistrations,
        containerQueries: outputs.containerQueries,
      });

      await kv.put(key, value, ttl !== undefined ? { expirationTtl: ttl } : undefined);
    },
  };
}

/**
 * KV cache namespace.
 *
 * Provides a content-addressed boundary precomputation cache backed by a
 * generic KV interface (compatible with Cloudflare Workers KV, Deno KV,
 * Vercel KV, etc.). Cache keys encode the boundary content address and
 * the two-axis tier result (motion + design) so each tier combination
 * gets its own cached CSS compilation output.
 *
 * @example
 * ```ts
 * import { KVCache } from '@czap/edge';
 *
 * const kv = { get: async (k: string) => null, put: async (k: string, v: string) => {} };
 * const cache = KVCache.createBoundaryCache(kv, { ttl: 3600 });
 * const outputs = await cache.getCompiledOutputs(boundaryId, tierResult);
 * if (!outputs) {
 *   await cache.putCompiledOutputs(boundaryId, tierResult, compiled);
 * }
 * ```
 */
export const KVCache = {
  createBoundaryCache,
} as const;

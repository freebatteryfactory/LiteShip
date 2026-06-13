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
 * Precompiled outputs for a single boundary at a given tier.
 */
export interface CompiledOutputs {
  readonly css: string;
  readonly propertyRegistrations: string;
  readonly containerQueries: string;
  /**
   * Authored per-state ARIA/data attributes (`@aria` blocks), keyed by state
   * name then attribute (`ARIACompileResult.stateAttributes`). Tier-invariant.
   * Absent when the boundary declares no `@aria` — most boundaries. The runtime
   * resolves `aria[currentState]` so authored attributes update on crossings.
   */
  readonly aria?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Compiled GLSL cast (`@glsl` blocks): the shader preamble `declarations`
   * the runtime prepends to a fragment shader plus the default `uniformValues`
   * keyed by GLSL uniform identifier (`GLSLCompileResult`). Tier-invariant.
   * Absent when the boundary declares no `@glsl` — most boundaries. The live
   * GPU runtime consumer (`runtime/gpu.ts`) is out of the D0 data-path scope;
   * D0 only carries this field end to end.
   */
  readonly glsl?: CompiledGLSLOutput;
  /**
   * Compiled WGSL cast (`@wgsl` blocks): the WebGPU preamble `declarations`
   * (state consts + uniform struct + binding) plus the default `bindingValues`
   * keyed by WGSL field name (`WGSLCompileResult`). Tier-invariant. Absent when
   * the boundary declares no `@wgsl`. The live WebGPU runtime consumer
   * (`runtime/wgpu.ts`) is out of the D0 data-path scope; D0 only carries it.
   */
  readonly wgsl?: CompiledWGSLOutput;
}

/**
 * Serialized GLSL cast artifact stored on {@link CompiledOutputs.glsl}: the
 * shader preamble plus default uniform values. JSON-round-trippable subset of
 * `@czap/compiler`'s `GLSLCompileResult` (the structured `defines`/`uniforms`
 * arrays re-derive from `declarations`, so only the runtime-needed fields are
 * stored).
 */
export interface CompiledGLSLOutput {
  /** `#define` + `uniform` shader preamble block. */
  readonly declarations: string;
  /** Default uniform values keyed by GLSL uniform identifier (`u_*`). */
  readonly uniformValues: Readonly<Record<string, number>>;
}

/**
 * Serialized WGSL cast artifact stored on {@link CompiledOutputs.wgsl}: the
 * WebGPU preamble plus default binding values. JSON-round-trippable subset of
 * `@czap/compiler`'s `WGSLCompileResult`.
 */
export interface CompiledWGSLOutput {
  /** State consts + uniform struct + `@group/@binding` preamble block. */
  readonly declarations: string;
  /** Default binding values keyed by WGSL struct field name. */
  readonly bindingValues: Readonly<Record<string, number>>;
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

/** Coerce an `unknown` JSON value into a `Record<string, number>` (drops non-numeric). */
function asNumberRecord(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'number') out[k] = v;
    }
  }
  return out;
}

/**
 * Parse a serialized GLSL/WGSL cast artifact: a `declarations` string plus a
 * numeric values map under `valuesKey` (`uniformValues` for GLSL,
 * `bindingValues` for WGSL). Returns `null` for absent/malformed entries so
 * the caller treats them as "no cast authored" rather than throwing — the
 * same lenient policy the `aria` field follows.
 */
function parseShaderCast<K extends 'uniformValues' | 'bindingValues'>(
  value: unknown,
  valuesKey: K,
): ({ readonly declarations: string } & { readonly [P in K]: Readonly<Record<string, number>> }) | null {
  if (typeof value !== 'object' || value === null || !('declarations' in value)) return null;
  return {
    declarations: String((value as { declarations: unknown }).declarations),
    [valuesKey]: asNumberRecord((value as Record<string, unknown>)[valuesKey]),
  } as { readonly declarations: string } & { readonly [P in K]: Readonly<Record<string, number>> };
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
        const aria = (parsed as { aria?: unknown }).aria;
        const glsl = parseShaderCast((parsed as { glsl?: unknown }).glsl, 'uniformValues');
        const wgsl = parseShaderCast((parsed as { wgsl?: unknown }).wgsl, 'bindingValues');
        return {
          css: String(parsed.css),
          propertyRegistrations: String(parsed.propertyRegistrations),
          containerQueries: String(parsed.containerQueries),
          ...(typeof aria === 'object' && aria !== null
            ? { aria: aria as Readonly<Record<string, Readonly<Record<string, string>>>> }
            : {}),
          ...(glsl ? { glsl } : {}),
          ...(wgsl ? { wgsl } : {}),
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
        ...(outputs.aria ? { aria: outputs.aria } : {}),
        ...(outputs.glsl ? { glsl: outputs.glsl } : {}),
        ...(outputs.wgsl ? { wgsl: outputs.wgsl } : {}),
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

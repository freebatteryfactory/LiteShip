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

import { Diagnostics, contentAddressOf, type ContentAddress } from '@czap/core';
import type { EdgeTierResult } from './edge-tier.js';
import { tierKey } from './manifest.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal KV namespace interface -- compatible with Cloudflare Workers KV,
 * Deno KV, or any adapter that implements get/put with string values.
 *
 * `delete` and `list` are OPTIONAL: they power active invalidation
 * ({@link BoundaryCache.invalidateByPath} / {@link BoundaryCache.invalidateByTag}).
 * A provider that omits them still caches correctly — invalidation then degrades
 * to the passive TTL-orphaning the content-addressed keyspace already relies on,
 * with a one-time diagnostic instead of a silent no-op.
 */
export interface KVNamespace {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  /** Delete a single key. Optional — required for active invalidation. */
  delete?(key: string): Promise<void>;
  /**
   * List keys under a prefix (Cloudflare Workers KV shape, paginated). Optional —
   * required for {@link BoundaryCache.invalidateByPath} (prefix-scan purge).
   */
  list?(options: {
    prefix: string;
    cursor?: string;
  }): Promise<{ keys: ReadonlyArray<{ name: string }>; list_complete: boolean; cursor?: string }>;
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
  /**
   * Per-state authored uniform values keyed by state name then `u_*` identifier.
   * Rides the satellite payload so the live runtime resolves
   * `stateUniforms[currentState]` and updates uniforms on each boundary crossing
   * — the GLSL analog of `CompiledOutputs.aria`. Absent when the boundary's
   * `@glsl` blocks authored no per-state values.
   */
  readonly stateUniforms?: Readonly<Record<string, Readonly<Record<string, number>>>>;
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
  /**
   * Per-state authored binding values keyed by state name then field name — the
   * WGSL analog of {@link CompiledGLSLOutput.stateUniforms}. Rides the satellite
   * payload so the runtime resolves `stateBindings[currentState]` and updates
   * struct fields on each crossing. Absent when no per-state values were authored.
   */
  readonly stateBindings?: Readonly<Record<string, Readonly<Record<string, number>>>>;
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
   * `themeFp` likewise segregates outputs compiled under different resolved
   * themes (a per-request theme is a real input to the cached CSS).
   */
  getCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: EdgeTierResult,
    qualifier?: string,
    themeFp?: string,
  ): Promise<CompiledOutputs | null>;

  putCompiledOutputs(
    boundaryId: ContentAddress,
    tierResult: EdgeTierResult,
    outputs: CompiledOutputs,
    qualifier?: string,
    themeFp?: string,
    tags?: readonly string[],
  ): Promise<void>;

  /**
   * Active purge by content address: delete every cached tier × theme variant of
   * one boundary (the passive answer is to mint a new `ContentAddress` and wait
   * for TTL — see ADR-0017). Requires `KVNamespace.list` + `delete`; without them
   * it emits a diagnostic and returns 0. Resolves to the number of keys deleted.
   */
  invalidateByPath(boundaryId: ContentAddress): Promise<number>;

  /**
   * Active purge by tag (Astro 7 `Astro.cache` tag parity): delete every entry
   * stored with `tag` via {@link putCompiledOutputs}'s `tags`, across all of their
   * tier/theme variants. Uses per-entry tag indexes when `KVNamespace.list` is
   * available, with a legacy JSON-index fallback. Requires `KVNamespace.delete`;
   * without it emits a
   * diagnostic and returns 0. Resolves to the number of keys deleted.
   */
  invalidateByTag(tag: string): Promise<number>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface CacheOptions {
  /**
   * Cache entry TTL in seconds. This is an eviction/cost knob, not a
   * freshness knob: an entry is keyed by its boundary content address, tier,
   * name, and resolved-theme fingerprint, so it never goes stale for a change
   * in ANY of those. (A `compile` callback whose output ALSO depends on
   * build-time inputs outside the boundary's own content — e.g. shared layout
   * CSS — must additionally vary `prefix` per deploy; see {@link CacheOptions.prefix}.)
   * Each deploy that changes boundary content mints a new `ContentAddress`,
   * orphaning the old keys — and Workers KV never evicts on its own and bills
   * storage. Set a TTL to garbage-collect superseded builds. Omit to cache
   * indefinitely.
   */
  readonly ttl?: number;
  /**
   * KV key prefix (default `czap`). Doubles as the per-deploy CONTENT VERSION
   * for a bundled `compile` callback: when compile's output depends on
   * build-time content the boundary id does not cover, set `prefix` to a hash
   * of that compiled output (e.g. `layout-${fnv1a(compileLayoutCss())}`) so a
   * content change busts the keyspace.
   */
  readonly prefix?: string;
}

function buildCacheKey(
  prefix: string,
  boundaryId: ContentAddress,
  tierResult: EdgeTierResult,
  qualifier?: string,
  themeFp?: string,
): string {
  // Tier portion shares `tierKey` with manifest lookups so the KV keyspace
  // and the precompiled-manifest keyspace can never disagree. The qualifier
  // (boundary NAME in multi-boundary configs) segregates same-id boundaries
  // whose CSS differs; unqualified single-boundary keys are unchanged. The
  // theme fingerprint (when a theme feeds compile) segregates outputs baked
  // with different resolved themes — a per-request theme is a real input to
  // the cached value, so it belongs IN the key, not standing beside it.
  const base =
    qualifier === undefined
      ? `${prefix}:boundary:${boundaryId}:${tierKey(tierResult)}`
      : `${prefix}:boundary:${boundaryId}:${qualifier}:${tierKey(tierResult)}`;
  return themeFp === undefined ? base : `${base}:t:${themeFp}`;
}

/**
 * Key prefix covering EVERY cached variant of one boundary — both qualified and
 * unqualified, across all tier and theme suffixes — since every variant key
 * starts `{prefix}:boundary:{boundaryId}:`. The list-scan target for
 * {@link BoundaryCache.invalidateByPath}.
 */
function boundaryKeyPrefix(prefix: string, boundaryId: ContentAddress): string {
  return `${prefix}:boundary:${boundaryId}:`;
}

/**
 * Legacy tag-index key. Older builds stored `{prefix}:tag:{tag}` as one JSON
 * array. List-capable providers write per-entry members below this prefix to
 * avoid read-merge-write lost updates under concurrent first hits; providers
 * without `list` keep the legacy JSON index so `invalidateByTag` can discover
 * keys directly.
 */
function tagIndexKey(prefix: string, tag: string): string {
  return `${prefix}:tag:${tag}`;
}

function tagMemberPrefix(prefix: string, tag: string): string {
  return `${prefix}:tag:${contentAddressOf(tag).replace(/^fnv1a:/, '')}:`;
}

function tagMemberKey(prefix: string, tag: string, key: string): string {
  return `${tagMemberPrefix(prefix, tag)}${contentAddressOf(key).replace(/^fnv1a:/, '')}`;
}

function tagIndexRoot(prefix: string): string {
  return `${prefix}:tag:`;
}

/** Parse a tag-index value into a unique key list (lenient: a corrupt index reads as empty). */
function parseTagIndex(raw: string | null): string[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    // A corrupt/foreign tag index reads as empty — the conservative direction
    // (invalidation finds no keys rather than throwing). A non-syntax error is a
    // real fault, never laundered into an empty result: bind it, inspect it,
    // rethrow it (the same discipline as tryParseJson below).
    if (cause instanceof SyntaxError) return [];
    throw cause;
  }
  return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

/** One-time diagnostic when invalidation can't run because the KV provider lacks a capability. */
function warnInvalidationUnsupported(operation: string, missing: 'delete' | 'list'): void {
  Diagnostics.warnOnce({
    source: 'czap/edge.kv-cache',
    code: 'invalidation-unsupported',
    message:
      `${operation} requires KVNamespace.${missing}, which this KV provider does not implement — ` +
      'returning 0 without purging. Entries are reclaimed by TTL instead (set CacheOptions.ttl). ' +
      'Cloudflare Workers KV implements delete/list; some KV adapters do not.',
  });
}

/** Add `key` to each tag's per-entry index. One key per KV member avoids lost updates. */
async function addKeyToTagIndexes(
  kv: KVNamespace,
  prefix: string,
  key: string,
  tags: readonly string[],
  ttl: number | undefined,
): Promise<void> {
  if (kv.list === undefined) {
    await Promise.all(tags.map((tag) => addKeyToLegacyTagIndex(kv, prefix, tag, key, ttl)));
    return;
  }
  await Promise.all(
    tags.map(async (tag) => {
      await kv.put(tagMemberKey(prefix, tag, key), key, ttl !== undefined ? { expirationTtl: ttl } : undefined);
    }),
  );
}

async function addKeyToLegacyTagIndex(
  kv: KVNamespace,
  prefix: string,
  tag: string,
  key: string,
  ttl: number | undefined,
): Promise<void> {
  const indexKey = tagIndexKey(prefix, tag);
  const keys = parseTagIndex(await kv.get(indexKey));
  const nextKeys = keys.includes(key) ? keys : [...keys, key];
  await kv.put(indexKey, JSON.stringify(nextKeys), ttl !== undefined ? { expirationTtl: ttl } : undefined);
}

/** Collect every key under `prefix`, following Cloudflare KV list pagination to completion. */
async function listAllKeys(kv: Required<Pick<KVNamespace, 'list'>>, prefix: string): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;
  // Bounded by list_complete; the cursor advances each page (Workers KV pages at 1000).
  for (;;) {
    const page = await kv.list(cursor === undefined ? { prefix } : { prefix, cursor });
    for (const entry of page.keys) names.push(entry.name);
    if (page.list_complete || page.cursor === undefined) break;
    cursor = page.cursor;
  }
  return names;
}

/** Delete every key concurrently. Caller guarantees `kv.delete` is present. */
async function deleteAll(kv: Required<Pick<KVNamespace, 'delete'>>, keys: readonly string[]): Promise<void> {
  await Promise.all(keys.map((key) => kv.delete(key)));
}

async function tagKeysForTag(
  kv: KVNamespace,
  prefix: string,
  tag: string,
): Promise<{
  readonly dataKeys: readonly string[];
  readonly memberKeys: readonly string[];
  readonly legacyIndexKey: string;
}> {
  const legacyIndexKey = tagIndexKey(prefix, tag);
  const dataKeys = new Set(parseTagIndex(await kv.get(legacyIndexKey)));
  let memberKeys: string[] = [];
  if (kv.list !== undefined) {
    memberKeys = await listAllKeys({ list: kv.list.bind(kv) }, tagMemberPrefix(prefix, tag));
    const memberValues = await Promise.all(memberKeys.map((memberKey) => kv.get(memberKey)));
    for (const value of memberValues) {
      if (value !== null && value.length > 0) dataKeys.add(value);
    }
  }
  return { dataKeys: [...dataKeys], memberKeys, legacyIndexKey };
}

async function deleteTagMembersForDataKeys(
  kv: KVNamespace,
  prefix: string,
  dataKeys: readonly string[],
  ttl: number | undefined,
): Promise<void> {
  if (kv.list === undefined || kv.delete === undefined || dataKeys.length === 0) return;
  const dataKeySet = new Set(dataKeys);
  const tagIndexKeys = await listAllKeys({ list: kv.list.bind(kv) }, tagIndexRoot(prefix));
  const staleTagKeys: string[] = [];
  const legacyIndexUpdates: Array<Promise<void>> = [];
  await Promise.all(
    tagIndexKeys.map(async (tagKey) => {
      const value = await kv.get(tagKey);
      if (value === null) return;
      if (value.startsWith(`${prefix}:boundary:`)) {
        if (dataKeySet.has(value)) staleTagKeys.push(tagKey);
        return;
      }
      const legacyKeys = parseTagIndex(value);
      if (legacyKeys.length === 0) return;
      const survivors = legacyKeys.filter((key) => !dataKeySet.has(key));
      if (survivors.length === legacyKeys.length) return;
      if (survivors.length === 0) {
        staleTagKeys.push(tagKey);
        return;
      }
      legacyIndexUpdates.push(
        kv.put(tagKey, JSON.stringify(survivors), ttl !== undefined ? { expirationTtl: ttl } : undefined),
      );
    }),
  );
  await Promise.all(legacyIndexUpdates);
  await deleteAll({ delete: kv.delete.bind(kv) }, staleTagKeys);
}

/**
 * Coerce an `unknown` JSON value into a per-state `Record<state, Record<u_*, number>>`
 * (drops non-numeric leaves, non-object states). Returns `undefined` when nothing
 * survives so the GLSL `stateUniforms` field stays absent. The live runtime
 * resolves `stateUniforms[currentState]` to update authored uniforms on crossings.
 */
function asNestedNumberRecord(value: unknown): Readonly<Record<string, Readonly<Record<string, number>>>> | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const [state, inner] of Object.entries(value)) {
    out[state] = asNumberRecord(inner);
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
  // Reject malformed cache data (e.g. a stale or foreign KV entry) so it degrades
  // cleanly to "no cast" instead of rehydrating a bogus cast: a non-string
  // `declarations` must NOT be coerced to "[object Object]", and a values map that
  // collapsed to `{}` carries no authored output.
  const declarations = (value as { declarations: unknown }).declarations;
  if (typeof declarations !== 'string' || declarations.length === 0) return null;
  const values = asNumberRecord((value as Record<string, unknown>)[valuesKey]);
  if (Object.keys(values).length === 0) return null;
  return {
    declarations,
    [valuesKey]: values,
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
      themeFp?: string,
    ): Promise<CompiledOutputs | null> {
      const key = buildCacheKey(prefix, boundaryId, tierResult, qualifier, themeFp);
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
        const glslBase = parseShaderCast((parsed as { glsl?: unknown }).glsl, 'uniformValues');
        // Per-state authored uniforms ride the GLSL cast so the live runtime can
        // resolve `stateUniforms[currentState]` — the GLSL analog of `aria`.
        const glslStateUniforms = asNestedNumberRecord(
          (parsed as { glsl?: { stateUniforms?: unknown } }).glsl?.stateUniforms,
        );
        const glsl = glslBase
          ? { ...glslBase, ...(glslStateUniforms ? { stateUniforms: glslStateUniforms } : {}) }
          : null;
        const wgslBase = parseShaderCast((parsed as { wgsl?: unknown }).wgsl, 'bindingValues');
        // Per-state authored bindings ride the WGSL cast so the live runtime can
        // resolve `stateBindings[currentState]` — the WGSL analog of stateUniforms.
        const wgslStateBindings = asNestedNumberRecord(
          (parsed as { wgsl?: { stateBindings?: unknown } }).wgsl?.stateBindings,
        );
        const wgsl = wgslBase
          ? { ...wgslBase, ...(wgslStateBindings ? { stateBindings: wgslStateBindings } : {}) }
          : null;
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
      themeFp?: string,
      tags?: readonly string[],
    ): Promise<void> {
      const key = buildCacheKey(prefix, boundaryId, tierResult, qualifier, themeFp);
      const value = JSON.stringify({
        css: outputs.css,
        propertyRegistrations: outputs.propertyRegistrations,
        containerQueries: outputs.containerQueries,
        ...(outputs.aria ? { aria: outputs.aria } : {}),
        ...(outputs.glsl ? { glsl: outputs.glsl } : {}),
        ...(outputs.wgsl ? { wgsl: outputs.wgsl } : {}),
      });

      await kv.put(key, value, ttl !== undefined ? { expirationTtl: ttl } : undefined);

      // Maintain the tag→keys index so invalidateByTag can find this entry later.
      if (tags && tags.length > 0) {
        await addKeyToTagIndexes(kv, prefix, key, tags, ttl);
      }
    },

    async invalidateByPath(boundaryId: ContentAddress): Promise<number> {
      if (kv.list === undefined) {
        warnInvalidationUnsupported('invalidateByPath', 'list');
        return 0;
      }
      if (kv.delete === undefined) {
        warnInvalidationUnsupported('invalidateByPath', 'delete');
        return 0;
      }
      const keys = await listAllKeys({ list: kv.list.bind(kv) }, boundaryKeyPrefix(prefix, boundaryId));
      await deleteAll({ delete: kv.delete.bind(kv) }, keys);
      await deleteTagMembersForDataKeys(kv, prefix, keys, ttl);
      return keys.length;
    },

    async invalidateByTag(tag: string): Promise<number> {
      if (kv.delete === undefined) {
        warnInvalidationUnsupported('invalidateByTag', 'delete');
        return 0;
      }
      const del = { delete: kv.delete.bind(kv) };
      const { dataKeys, memberKeys, legacyIndexKey } = await tagKeysForTag(kv, prefix, tag);
      await deleteAll(del, dataKeys);
      await deleteAll(del, memberKeys);
      await deleteTagMembersForDataKeys(kv, prefix, dataKeys, ttl);
      // Drop the legacy index entry itself so a re-tagged boundary starts clean.
      await del.delete(legacyIndexKey);
      return dataKeys.length;
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

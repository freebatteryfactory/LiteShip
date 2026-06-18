/**
 * EdgeHostAdapter -- canonical host-facing edge resolution path.
 *
 * Resolves client hints, tiering, optional theme compilation, and optional
 * boundary compilation cache lookups in a single host-level operation.
 *
 * @module
 */

import { Diagnostics, contentAddressOf } from '@czap/core';
import type { ContentAddress } from '@czap/core';
import type { ExtendedDeviceCapabilities } from '@czap/detect';
import { ClientHints } from './client-hints.js';
import type { ClientHintsHeaders } from './client-hints.js';
import { EdgeTier } from './edge-tier.js';
import type { EdgeTierResult } from './edge-tier.js';
import { createBoundaryCache } from './kv-cache.js';
import type { CompiledOutputs, KVNamespace } from './kv-cache.js';
import { tierKey } from './manifest.js';
import type { TierKey } from './manifest.js';
import { compileTheme } from './theme-compiler.js';
import type { ThemeCompileConfig, ThemeCompileResult } from './theme-compiler.js';

/**
 * Detected device context available to host callbacks before compile.
 *
 * Pairs the parsed {@link ExtendedDeviceCapabilities} with the resolved
 * {@link EdgeTierResult} so a host can derive a theme config or compile
 * decision without re-parsing headers.
 */
export interface EdgeHostContext {
  /** Capabilities parsed from Client Hints. */
  readonly capabilities: ExtendedDeviceCapabilities;
  /** Derived tier triple (cap, motion, design). */
  readonly tier: EdgeTierResult;
}

/**
 * Compile-time context passed to {@link EdgeHostCacheConfig.compile}.
 *
 * Extends {@link EdgeHostContext} with the already-resolved theme result
 * (if any) so host compile callbacks can inject theme tokens into the
 * compiled per-state outputs without recomputation. Carries the identity
 * of the boundary being compiled so a callback shared across multiple
 * boundaries can branch -- without it, one compile result would be cached
 * under every boundary's content address.
 */
export interface EdgeHostCompileContext extends EdgeHostContext {
  /** Pre-compiled theme output, if the adapter resolved one for this request. */
  readonly theme?: ThemeCompileResult;
  /** Content address of the boundary this compile call is for. */
  readonly boundaryId: ContentAddress;
  /** Boundary name, when configured via {@link EdgeHostCacheConfig.boundaries}. */
  readonly boundaryName?: string;
}

/**
 * Outputs source for one boundary -- the per-boundary slice of
 * {@link EdgeHostCacheConfig}. Resolution order per boundary is
 * `precompiled`, then KV keyed by `(boundaryId, tier)`, then `compile`
 * (written back to KV). At least one of `precompiled` or `compile` is
 * required.
 */
export interface EdgeHostBoundaryConfig {
  /** Content address of the boundary being compiled (`Boundary.make`'s `id`). */
  readonly boundaryId: ContentAddress;
  /**
   * Build-derived outputs keyed by {@link TierKey} -- the `outputsByTier`
   * field of a boundary manifest entry. Checked before KV.
   */
  readonly precompiled?: Readonly<Partial<Record<TierKey, CompiledOutputs>>>;
  /** Compile function invoked when neither `precompiled` nor KV has the tier. */
  readonly compile?: (context: EdgeHostCompileContext) => Promise<CompiledOutputs> | CompiledOutputs;
}

/**
 * Cache configuration for the edge host adapter.
 *
 * Two forms, mutually exclusive. Single boundary: `boundaryId` plus
 * `precompiled`/`compile` at the top level. Multiple boundaries (real
 * pages render several): `boundaries`, a name-keyed record of
 * {@link EdgeHostBoundaryConfig}. Either way, outputs per boundary are
 * resolved in order: `precompiled` (build-derived manifest entry, no KV
 * round-trip), then the KV cache keyed by `(boundaryId, tier)` -- the key
 * carries the boundary's content address, so boundaries can never read
 * each other's cached CSS -- then `compile` on a miss (result written
 * back to KV with the configured `ttl`).
 */
export interface EdgeHostCacheConfig {
  /** KV namespace backing the boundary cache. */
  readonly kv: KVNamespace;
  /**
   * Content address of the boundary being compiled (`Boundary.make`'s
   * `id`). Single-boundary form; exclusive with `boundaries`.
   */
  readonly boundaryId?: ContentAddress;
  /**
   * Build-derived outputs keyed by {@link TierKey}
   * (`"<motionTier>:<designTier>"`) -- a manifest entry inflated via
   * `resolveOutputsByTier(manifestEntry)`. Checked before KV; a covered
   * tier never touches the network.
   */
  readonly precompiled?: Readonly<Partial<Record<TierKey, CompiledOutputs>>>;
  /** Compile function invoked when neither `precompiled` nor KV has the tier. */
  readonly compile?: (context: EdgeHostCompileContext) => Promise<CompiledOutputs> | CompiledOutputs;
  /**
   * Multi-boundary form: outputs sources keyed by boundary name (the
   * manifest export name). Exclusive with the top-level
   * `boundaryId`/`precompiled`/`compile` fields.
   */
  readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryConfig>>;
  /**
   * Cache entry TTL in seconds — an eviction/cost knob, not a freshness
   * knob. An entry is keyed by boundary content address, tier, name, and
   * resolved-theme fingerprint, so it never goes stale for a change in any of
   * those. (A `compile` whose output also depends on build-time inputs the
   * boundary id does not cover must vary `prefix` per deploy — see `prefix`.)
   * Deploys that change boundary content mint a new `ContentAddress` and
   * orphan the old keys, which KV stores (and bills) forever unless a TTL
   * reclaims them. Omit to cache indefinitely.
   */
  readonly ttl?: number;
  /**
   * Optional KV key prefix. Doubles as the per-deploy content version for a
   * bundled `compile`: set it to a hash of compile's output (e.g.
   * `layout-${fnv1a(compileLayoutCss())}`) when that output depends on
   * build-time content outside the boundary's own address.
   */
  readonly prefix?: string;
}

/**
 * Configuration for {@link createEdgeHostAdapter}.
 *
 * `theme` may be a static {@link ThemeCompileConfig}, a per-request
 * resolver function, or absent. `cache` enables a KV-backed boundary
 * compile cache keyed by content address + tier.
 */
export interface EdgeHostAdapterConfig {
  /** Static theme config, or a resolver invoked with each request's context. */
  readonly theme?: ThemeCompileConfig | ((context: EdgeHostContext) => ThemeCompileConfig | null | undefined);
  /** KV-backed boundary output cache; omit to disable caching. */
  readonly cache?: EdgeHostCacheConfig;
}

/**
 * Cache lookup outcome reported in {@link EdgeHostResolution}.
 * `'precompiled'` means the outputs came from the build-derived manifest
 * without touching KV.
 */
export type EdgeHostCacheStatus = 'disabled' | 'precompiled' | 'hit' | 'miss';

/**
 * Per-boundary resolution outcome, reported in
 * {@link EdgeHostResolution.boundaries} when the cache is configured with
 * the multi-boundary form.
 */
export interface EdgeHostBoundaryResolution {
  /** Content address the outputs were resolved (and cached) under. */
  readonly boundaryId: ContentAddress;
  /** Compiled per-state outputs; absent on an uncovered tier with no `compile`. */
  readonly compiledOutputs?: CompiledOutputs;
  /** Where this boundary's outputs came from (`'disabled'` cannot occur per boundary). */
  readonly cacheStatus: Exclude<EdgeHostCacheStatus, 'disabled'>;
}

/**
 * Full per-request resolution output from {@link EdgeHostAdapter.resolve}.
 *
 * Carries the device context, optional theme and compiled outputs, the
 * `data-czap-*` attribute string for the root HTML element, and the
 * `Accept-CH`/`Critical-CH` headers the response should send back.
 */
export interface EdgeHostResolution extends EdgeHostContext {
  /** Compiled theme result, if a theme config was resolved for this request. */
  readonly theme?: ThemeCompileResult;
  /**
   * Compiled per-state outputs when exactly one boundary is configured
   * (either form). Undefined with multiple boundaries -- read
   * {@link boundaries} instead.
   */
  readonly compiledOutputs?: CompiledOutputs;
  /** Per-boundary outcomes, keyed by name; present with the `boundaries` cache form. */
  readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryResolution>>;
  /** `data-czap-tier`/`data-czap-motion`/`data-czap-design` string for `<html>` (one per `CAP_AXES`). */
  readonly htmlAttributes: string;
  /** Response headers to send back so the browser will supply hints next time. */
  readonly responseHeaders: {
    /** `Accept-CH` header value. */
    readonly acceptCH: string;
    /** `Critical-CH` header value. */
    readonly criticalCH: string;
  };
  /**
   * Whether boundary outputs came from cache, were computed and stored,
   * or caching is off. With multiple boundaries this is the worst case
   * across them (worst-to-best: `miss`, `hit`, `precompiled`);
   * per-boundary statuses live in {@link boundaries}.
   */
  readonly cacheStatus: EdgeHostCacheStatus;
}

/**
 * Opaque host-facing adapter returned by {@link createEdgeHostAdapter}.
 *
 * Call `resolve(headers)` per request; the adapter drives tier detection,
 * theme compilation, and boundary caching in a single pass.
 */
export interface EdgeHostAdapter {
  /** Resolve a request's device context, theme, and compiled outputs. */
  resolve(headers: Headers | ClientHintsHeaders): Promise<EdgeHostResolution>;
}

function resolveThemeConfig(
  theme: EdgeHostAdapterConfig['theme'],
  context: EdgeHostContext,
): ThemeCompileConfig | null | undefined {
  if (typeof theme === 'function') {
    return theme(context);
  }
  return theme;
}

/**
 * Normalized boundary list: `name` is null for the legacy single-field
 * form (which reports through the top-level resolution fields only).
 */
type NormalizedBoundary = readonly [name: string | null, source: EdgeHostBoundaryConfig];

function normalizeBoundaries(cache: EdgeHostCacheConfig): readonly NormalizedBoundary[] {
  const hasSingleFields =
    cache.boundaryId !== undefined || cache.precompiled !== undefined || cache.compile !== undefined;
  if (cache.boundaries) {
    if (hasSingleFields) {
      throw new Error(
        'EdgeHostCacheConfig mixes the multi-boundary `boundaries` record with the single-boundary ' +
          '`boundaryId`/`precompiled`/`compile` fields, so the adapter cannot tell which form is intended. ' +
          'Fix: move the top-level boundary fields into their own `boundaries` entry, or drop `boundaries`.',
      );
    }
    const entries = Object.entries(cache.boundaries);
    if (entries.length === 0) {
      throw new Error(
        'EdgeHostCacheConfig got an empty `boundaries` record, so there is nothing to cache. ' +
          'Fix: add one entry per boundary (`{ [name]: { boundaryId: entry.id, precompiled: resolveOutputsByTier(entry) } }`), ' +
          'or use the single-boundary `boundaryId` form.',
      );
    }
    for (const [name, source] of entries) {
      if (!source.precompiled && !source.compile) {
        throw new Error(
          `EdgeHostCacheConfig boundary "${name}" has neither \`precompiled\` nor \`compile\`, so its outputs can never resolve. ` +
            'Fix: pass `precompiled: resolveOutputsByTier(manifestEntry)` (entry from `virtual:czap/boundaries` or czap-boundary-manifest.json), ' +
            'or supply a `compile` callback to build outputs on KV cache miss.',
        );
      }
    }
    return entries;
  }
  if (cache.boundaryId === undefined) {
    throw new Error(
      'EdgeHostCacheConfig identifies no boundary: neither `boundaryId` (single form) nor `boundaries` (multi form) was provided. ' +
        'Fix: pass `boundaryId: Boundary.make(...).id` with `precompiled`/`compile`, or a `boundaries` record keyed by name.',
    );
  }
  if (!cache.precompiled && !cache.compile) {
    throw new Error(
      'EdgeHostCacheConfig needs a source of compiled outputs, but neither `precompiled` nor `compile` was provided. ' +
        'Fix: pass `precompiled: resolveOutputsByTier(manifestEntry)` (entry from `virtual:czap/boundaries` or czap-boundary-manifest.json), ' +
        'or supply a `compile` callback to build outputs on KV cache miss.',
    );
  }
  return [[null, { boundaryId: cache.boundaryId, precompiled: cache.precompiled, compile: cache.compile }]];
}

/** Badness order for the top-level aggregate: a miss anywhere wins. */
const CACHE_STATUS_RANK = { miss: 0, hit: 1, precompiled: 2 } as const;

/**
 * Short content fingerprint of a resolved theme, folded into the boundary
 * cache key. A per-request theme resolver feeds different tokens into
 * `compile`'s output, so the theme is part of the cached value's identity —
 * computed from the theme itself, never assumed invariant.
 */
function themeFingerprint(theme: ThemeCompileResult): string {
  return contentAddressOf(theme).replace(/^fnv1a:/, '').slice(0, 12);
}

async function resolveBoundaryOutputs(
  cache: ReturnType<typeof createBoundaryCache>,
  [name, source]: NormalizedBoundary,
  context: Omit<EdgeHostCompileContext, 'boundaryId' | 'boundaryName'>,
): Promise<EdgeHostBoundaryResolution> {
  const precompiled = source.precompiled?.[tierKey(context.tier)];
  if (precompiled) {
    return { boundaryId: source.boundaryId, compiledOutputs: precompiled, cacheStatus: 'precompiled' };
  }
  // The boundary NAME qualifies the KV key: two names can share one
  // ContentAddress (same Boundary.make definition) while their @quantize
  // CSS differs — id+tier alone would let the first compile serve both.
  const qualifier = name ?? undefined;
  // The resolved theme is a real input to a compiled output (compile may bake
  // theme tokens into the CSS), so its fingerprint joins the cache key — a
  // per-request theme can never serve another request's theme-baked CSS.
  const themeFp = context.theme ? themeFingerprint(context.theme) : undefined;
  const cached = await cache.getCompiledOutputs(source.boundaryId, context.tier, qualifier, themeFp);
  if (cached) {
    return { boundaryId: source.boundaryId, compiledOutputs: cached, cacheStatus: 'hit' };
  }
  if (source.compile) {
    const compiledOutputs = await source.compile({
      ...context,
      boundaryId: source.boundaryId,
      ...(name === null ? {} : { boundaryName: name }),
    });
    await cache.putCompiledOutputs(source.boundaryId, context.tier, compiledOutputs, qualifier, themeFp);
    return { boundaryId: source.boundaryId, compiledOutputs, cacheStatus: 'miss' };
  }
  Diagnostics.warnOnce({
    source: 'czap/edge.host-adapter',
    code: 'manifest-tier-gap',
    message:
      `Precompiled manifest for boundary "${source.boundaryId}" has no entry for tier "${tierKey(context.tier)}" ` +
      'and no `compile` fallback is configured, so this request gets no compiled outputs. ' +
      'Fix: rebuild so the manifest covers the full tier grid (collectBoundaryManifest enumerates it), ' +
      'or add a `compile` callback as a fallback.',
  });
  return { boundaryId: source.boundaryId, cacheStatus: 'miss' };
}

/**
 * Create an {@link EdgeHostAdapter} with optional theme and boundary cache.
 *
 * The returned adapter is designed to be instantiated once per worker and
 * reused across requests; it caches a compiled static theme eagerly and
 * only invokes the compile callback on cache miss when caching is enabled.
 */
export function createEdgeHostAdapter(config: EdgeHostAdapterConfig = {}): EdgeHostAdapter {
  let boundaryCache: ReturnType<typeof createBoundaryCache> | null = null;
  let boundarySources: readonly NormalizedBoundary[] = [];
  if (config.cache) {
    boundarySources = normalizeBoundaries(config.cache);
    boundaryCache = createBoundaryCache(config.cache.kv, {
      ttl: config.cache.ttl,
      prefix: config.cache.prefix,
    });
    // The KV key folds the boundary id, tier, name, and resolved theme; a
    // bundled `compile` whose output depends on build-time content beyond
    // those (e.g. shared layout CSS) needs a per-deploy content version via
    // `prefix`. Warn when a compile is configured without one so the
    // resulting cross-deploy staleness can't ship silently.
    if (config.cache.prefix === undefined && boundarySources.some(([, s]) => s.compile !== undefined)) {
      Diagnostics.warnOnce({
        source: 'czap/edge.host-adapter',
        code: 'compile-without-content-version',
        message:
          'A boundary `compile` callback is configured without a `prefix`. If compile\'s output depends on ' +
          'build-time content the boundary id does not cover (e.g. shared layout CSS), the cache can serve ' +
          'stale outputs across deploys that change it. Fix: set `prefix` to a per-deploy hash of compile\'s ' +
          'output, e.g. `prefix: "layout-" + fnv1a(compileLayoutCss())`.',
      });
    }
  }
  const staticThemeConfig = typeof config.theme === 'function' ? undefined : config.theme;
  let compiledStaticTheme: ThemeCompileResult | undefined;
  if (staticThemeConfig) {
    compiledStaticTheme = compileTheme(staticThemeConfig);
  }
  const responseHeaders = {
    acceptCH: ClientHints.acceptCHHeader(),
    criticalCH: ClientHints.criticalCHHeader(),
  } as const;

  return {
    async resolve(headers: Headers | ClientHintsHeaders): Promise<EdgeHostResolution> {
      const capabilities = ClientHints.parseClientHints(headers);
      const tier = EdgeTier.tierFromParsed(capabilities);
      const context: EdgeHostContext = { capabilities, tier };
      const themeConfig = compiledStaticTheme ? undefined : resolveThemeConfig(config.theme, context);
      let theme = compiledStaticTheme;
      if (!theme && themeConfig) {
        theme = compileTheme(themeConfig);
      }

      let compiledOutputs: CompiledOutputs | undefined;
      let boundaries: Record<string, EdgeHostBoundaryResolution> | undefined;
      let cacheStatus: EdgeHostCacheStatus = boundaryCache ? 'miss' : 'disabled';

      if (boundaryCache) {
        const cache = boundaryCache;
        const compileContext = { capabilities, tier, theme };
        // Boundaries are independent (distinct content addresses, distinct
        // KV keys), so their lookups run concurrently.
        const resolved = await Promise.all(
          boundarySources.map(
            async (entry) => [entry[0], await resolveBoundaryOutputs(cache, entry, compileContext)] as const,
          ),
        );
        cacheStatus = resolved.reduce<Exclude<EdgeHostCacheStatus, 'disabled'>>(
          (worst, [, outcome]) =>
            CACHE_STATUS_RANK[outcome.cacheStatus] < CACHE_STATUS_RANK[worst] ? outcome.cacheStatus : worst,
          'precompiled',
        );
        if (resolved.length === 1) {
          compiledOutputs = resolved[0]![1].compiledOutputs;
        }
        const named = resolved.filter(
          (entry): entry is readonly [string, EdgeHostBoundaryResolution] => entry[0] !== null,
        );
        if (named.length > 0) {
          boundaries = Object.fromEntries(named);
        }
      }

      return {
        capabilities,
        tier,
        theme,
        compiledOutputs,
        boundaries,
        htmlAttributes: EdgeTier.tierDataAttributes(tier),
        responseHeaders,
        cacheStatus,
      };
    },
  };
}

/**
 * Edge host adapter namespace.
 *
 * `EdgeHostAdapter.create(config)` builds a reusable adapter that resolves
 * Client Hints, tiers, theme compilation, and KV-backed boundary caching
 * in a single per-request pass.
 */
export const EdgeHostAdapter = {
  /** Alias for {@link createEdgeHostAdapter}. */
  create: createEdgeHostAdapter,
} as const;

export declare namespace EdgeHostAdapter {
  /** Alias for {@link EdgeHostAdapterConfig}. */
  export type Config = EdgeHostAdapterConfig;
  /** Alias for {@link EdgeHostResolution}. */
  export type Resolution = EdgeHostResolution;
  /** Alias for {@link EdgeHostCacheStatus}. */
  export type CacheStatus = EdgeHostCacheStatus;
  /** Alias for {@link EdgeHostContext}. */
  export type Context = EdgeHostContext;
  /** Alias for {@link EdgeHostCompileContext}. */
  export type CompileContext = EdgeHostCompileContext;
  /** Alias for {@link EdgeHostBoundaryConfig}. */
  export type BoundaryConfig = EdgeHostBoundaryConfig;
  /** Alias for {@link EdgeHostBoundaryResolution}. */
  export type BoundaryResolution = EdgeHostBoundaryResolution;
}

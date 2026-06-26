/**
 * Cloudflare Workers middleware glue for {@link @czap/astro} edge resolution.
 *
 * @module
 */

import { Diagnostics, type ContentAddress } from '@czap/core';
import type {
  BoundaryManifest,
  BoundaryManifestFile,
  EdgeHostAdapterConfig,
  EdgeHostBoundaryConfig,
  EdgeHostCacheTags,
  EdgeHostCacheConfig,
} from '@czap/edge';
import { resolveOutputsByTier } from '@czap/edge';
import { czapMiddleware } from '@czap/astro';
import { ValidationError } from '@czap/error';
import { createCloudflareEdgeCache, type CloudflareWorkersEnv } from './edge-cache.js';

export interface CloudflareMiddlewareConfig {
  /** KV namespace binding name in wrangler.jsonc. Defaults to `CZAP_BOUNDARY_CACHE`. */
  readonly binding?: string;
  /**
   * Build-derived boundary manifest -- import it from
   * `virtual:czap/boundaries` or read the emitted
   * `czap-boundary-manifest.json`. The middleware derives `boundaryId`
   * and per-tier precompiled outputs from it, so nothing is hand-typed.
   */
  readonly manifest?: BoundaryManifest | BoundaryManifestFile;
  /**
   * Which manifest boundaries to serve: a single name, a list of names,
   * or omitted to serve every boundary in the manifest. Each served
   * boundary keeps its own cache identity (content address), so
   * boundaries on the same page cannot poison each other's cached CSS.
   */
  readonly boundary?: string | readonly string[];
  /**
   * Escape hatch for custom hosts without a manifest: the boundary's
   * content address. Must be a real minted id (`Boundary.make(...).id`,
   * `fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
   * fabricated id breaks content-addressing (the cache could then serve a
   * different boundary's compiled CSS).
   */
  readonly boundaryId?: ContentAddress;
  /**
   * Escape hatch / fallback: compile function invoked when neither the
   * manifest nor KV covers the request's tier. With multiple boundaries
   * the callback is shared -- branch on `context.boundaryName` /
   * `context.boundaryId` to return the right boundary's outputs.
   */
  readonly compile?: EdgeHostCacheConfig['compile'];
  /** Optional theme config or per-request resolver. */
  readonly theme?: EdgeHostAdapterConfig['theme'];
  /**
   * Cache entry TTL in seconds — an eviction/cost knob, not a freshness
   * knob. An entry is keyed by boundary content address, tier, name, and
   * resolved-theme fingerprint, so it never goes stale for a change in any of
   * those. (A shared `compile` whose output also depends on build-time content
   * the boundary id does not cover must vary `prefix` per deploy.) Each
   * deploy that changes boundary content mints a new `ContentAddress`,
   * orphaning the old `boundaryId` x tier keys. Workers KV has no eviction
   * and bills storage, so set a TTL (e.g. `2592000` = 30 days) to reclaim
   * keys for superseded builds. Omit to cache indefinitely.
   */
  readonly ttl?: number;
  /** Optional KV key prefix. */
  readonly prefix?: string;
  /**
   * Tags written with boundary cache entries when a compile fallback fills KV.
   * Pass the same values as Astro `routeRules.tags` so `cache.invalidate({ tags })`
   * can purge CZAP boundary variants. A manifest config may use a boundary-name
   * map; a resolver can branch on `context.boundaryName` / `context.boundaryId`.
   */
  readonly tags?: EdgeHostCacheTags | Readonly<Record<string, EdgeHostCacheTags>>;
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

/** Read the workerd execution env captured by {@link loadWorkersEnvFromRuntime} or seeded for tests. Returns `{}` until one of those has run. */
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
    Diagnostics.warnOnce({
      source: 'czap/cloudflare.middleware',
      code: 'workers-env-unavailable',
      message:
        'cloudflare:workers is unavailable (not running on workerd), so Workers env bindings cannot be read from the runtime module. ' +
        'Fix: pass the env option to cloudflareMiddleware in tests or custom hosts.',
    });
    return getDefaultWorkersEnv();
  }
}

function resolveEnvSource(config: CloudflareMiddlewareConfig): () => CloudflareWorkersEnv {
  if (typeof config.env === 'function') return config.env;
  if (config.env) return () => config.env as CloudflareWorkersEnv;
  return () => getDefaultWorkersEnv();
}

function normalizeManifest(manifest: BoundaryManifest | BoundaryManifestFile): BoundaryManifest {
  // `_tag` discriminates the file envelope from the bare map; the cast is
  // contained here because a Record<string, BoundaryManifestEntry> cannot
  // also carry the literal `_tag: 'CzapBoundaryManifest'` field.
  const candidate = manifest as Partial<BoundaryManifestFile>;
  if (candidate._tag === 'CzapBoundaryManifest' && candidate.boundaries) {
    return candidate.boundaries;
  }
  return manifest as BoundaryManifest;
}

function isBoundaryTagMap(
  tags: CloudflareMiddlewareConfig['tags'],
): tags is Readonly<Record<string, EdgeHostCacheTags>> {
  return typeof tags === 'object' && tags !== null && !Array.isArray(tags);
}

function resolveTagsForBoundary(
  tags: CloudflareMiddlewareConfig['tags'],
  boundaryName: string,
): EdgeHostCacheTags | undefined {
  if (tags === undefined) return undefined;
  if (isBoundaryTagMap(tags)) return tags[boundaryName];
  return tags;
}

function resolveSingleBoundaryTags(tags: CloudflareMiddlewareConfig['tags']): EdgeHostCacheTags | undefined {
  if (tags === undefined) return undefined;
  if (!isBoundaryTagMap(tags)) return tags;
  const fallback = tags['default'];
  if (fallback !== undefined) return fallback;
  throw ValidationError(
    'cloudflare.middleware',
    'cloudflareMiddleware got a per-boundary `tags` map without a manifest boundary name to attach it to. ' +
      'Fix: pass a tag array/resolver for the `boundaryId` escape hatch, or use a manifest config where names are known.',
  );
}

/**
 * Resolve the cache identity + outputs source from the middleware config:
 * manifest-derived (preferred, name-keyed multi-boundary form) or the
 * hand-built single-boundary escape hatch.
 */
function resolveCacheSource(config: CloudflareMiddlewareConfig):
  | { readonly boundaries: Readonly<Record<string, EdgeHostBoundaryConfig>> }
  | {
      readonly boundaryId: ContentAddress;
      readonly compile: EdgeHostCacheConfig['compile'];
      readonly tags?: EdgeHostCacheTags;
    } {
  if (config.manifest) {
    const manifest = normalizeManifest(config.manifest);
    const names = Object.keys(manifest);
    if (names.length === 0) {
      throw ValidationError(
        'cloudflare.middleware',
        'cloudflareMiddleware received an empty boundary manifest, so there is no boundary to cache. ' +
          'Why: the build found no boundaries.ts / *.boundaries.ts exports in the project. ' +
          'Fix: add `export const myBoundary = Boundary.make({ ... })` to a boundary module (plus a @quantize CSS block ' +
          'for precompiled outputs), or fall back to the `boundaryId` + `compile` escape hatch.',
      );
    }
    const selected =
      config.boundary === undefined ? names : typeof config.boundary === 'string' ? [config.boundary] : config.boundary;
    if (selected.length === 0) {
      throw ValidationError(
        'cloudflare.middleware',
        'cloudflareMiddleware got an empty `boundary` list, so there is no boundary to serve. ' +
          `Fix: list some of the manifest's boundaries (${names.join(', ')}), or omit \`boundary\` to serve all of them.`,
      );
    }
    const boundaries: Record<string, EdgeHostBoundaryConfig> = {};
    for (const name of selected) {
      const entry = manifest[name];
      if (!entry) {
        throw ValidationError(
          'cloudflare.middleware',
          `cloudflareMiddleware was told to serve boundary "${name}", but the manifest only has: ${names.join(', ')}. ` +
            'Why: the name must match the boundary module export. Fix: pass one of the listed names, or export ' +
            `\`${name}\` from a boundaries.ts / *.boundaries.ts module and rebuild.`,
        );
      }
      // Inflate the deduplicated v2 entry (outputs pool + index cells) once
      // at construction; per-request lookups stay a plain map access.
      boundaries[name] = {
        boundaryId: entry.id,
        precompiled: resolveOutputsByTier(entry),
        compile: config.compile,
        tags: resolveTagsForBoundary(config.tags, name),
      };
    }
    return { boundaries };
  }

  if (config.boundaryId && config.compile) {
    return { boundaryId: config.boundaryId, compile: config.compile, tags: resolveSingleBoundaryTags(config.tags) };
  }

  throw ValidationError(
    'cloudflare.middleware',
    'cloudflareMiddleware needs either a build-derived `manifest` (import { boundaries } from "virtual:czap/boundaries") ' +
      'or the hand-built escape hatch (`boundaryId` from Boundary.make plus a `compile` callback). ' +
      'Neither was provided completely. Fix: pass `manifest: boundaries` -- the build derives the id and outputs for you.',
  );
}

/**
 * Astro middleware factory wired for Cloudflare Workers KV boundary caching.
 *
 * Boundary identities and precompiled outputs come from the
 * build-derived manifest (`virtual:czap/boundaries`), so no id is ever
 * hand-typed. Every manifest boundary is served by default (each under
 * its own content-addressed cache key); pass `boundary` to narrow.
 * `boundaryId` + `compile` remain as an escape hatch for custom hosts.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { cloudflareMiddleware } from '@czap/cloudflare';
 * import { boundaries } from 'virtual:czap/boundaries';
 *
 * export const onRequest = cloudflareMiddleware({
 *   binding: 'CZAP_BOUNDARY_CACHE',
 *   manifest: boundaries, // serves every boundary; `boundary: 'viewport'` narrows
 * });
 * ```
 */
export function cloudflareMiddleware(config: CloudflareMiddlewareConfig): ReturnType<typeof czapMiddleware> {
  const envSource = resolveEnvSource(config);
  const binding = config.binding ?? 'CZAP_BOUNDARY_CACHE';
  const kv = createCloudflareEdgeCache(envSource, { binding });
  const source = resolveCacheSource(config);
  const inner = czapMiddleware({
    edge: {
      cache: {
        kv,
        ...source,
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

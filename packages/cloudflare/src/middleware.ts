/**
 * Cloudflare Workers middleware glue for {@link @czap/astro} edge resolution.
 *
 * @module
 */

import type { ContentAddress } from '@czap/core';
import type { BoundaryManifest, BoundaryManifestFile, EdgeHostAdapterConfig, EdgeHostCacheConfig } from '@czap/edge';
import { resolveOutputsByTier } from '@czap/edge';
import { czapMiddleware } from '@czap/astro';
import { createCloudflareEdgeCache, type CloudflareWorkersEnv } from './edge-cache.js';

export interface CloudflareMiddlewareConfig {
  /** KV namespace binding name in wrangler.jsonc. */
  readonly binding: string;
  /**
   * Build-derived boundary manifest -- import it from
   * `virtual:czap/boundaries` or read the emitted
   * `czap-boundary-manifest.json`. The middleware derives `boundaryId`
   * and per-tier precompiled outputs from it, so nothing is hand-typed.
   */
  readonly manifest?: BoundaryManifest | BoundaryManifestFile;
  /**
   * Which manifest boundary to serve. Optional when the manifest has
   * exactly one entry.
   */
  readonly boundary?: string;
  /**
   * Escape hatch for custom hosts without a manifest: the boundary's
   * content address. Must be a real minted id (`Boundary.make(...).id`,
   * `fnv1a:xxxxxxxx`) -- the KV keyspace is content-addressed, so a
   * fabricated id breaks the never-stale invariant.
   */
  readonly boundaryId?: ContentAddress;
  /**
   * Escape hatch / fallback: compile function invoked when neither the
   * manifest nor KV covers the request's tier.
   */
  readonly compile?: EdgeHostCacheConfig['compile'];
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

/**
 * Resolve the cache identity + outputs source from the middleware config:
 * manifest-derived (preferred) or the hand-built escape hatch.
 */
function resolveCacheSource(config: CloudflareMiddlewareConfig): {
  readonly boundaryId: ContentAddress;
  readonly precompiled?: EdgeHostCacheConfig['precompiled'];
} {
  if (config.manifest) {
    const boundaries = normalizeManifest(config.manifest);
    const names = Object.keys(boundaries);
    if (names.length === 0) {
      throw new Error(
        'cloudflareMiddleware received an empty boundary manifest, so there is no boundary to cache. ' +
          'Why: the build found no boundaries.ts / *.boundaries.ts exports in the project. ' +
          'Fix: add `export const myBoundary = Boundary.make({ ... })` to a boundary module (plus a @quantize CSS block ' +
          'for precompiled outputs), or fall back to the `boundaryId` + `compile` escape hatch.',
      );
    }
    const name = config.boundary ?? (names.length === 1 ? names[0]! : undefined);
    if (name === undefined) {
      throw new Error(
        `cloudflareMiddleware got a manifest with ${names.length} boundaries (${names.join(', ')}) but no \`boundary\` selector, ` +
          'so it cannot tell which one to cache. Fix: pass `boundary: <one of those names>`.',
      );
    }
    const entry = boundaries[name];
    if (!entry) {
      throw new Error(
        `cloudflareMiddleware was told to serve boundary "${name}", but the manifest only has: ${names.join(', ')}. ` +
          'Why: the name must match the boundary module export. Fix: pass one of the listed names, or export ' +
          `\`${name}\` from a boundaries.ts / *.boundaries.ts module and rebuild.`,
      );
    }
    // Inflate the deduplicated v2 entry (outputs pool + index cells) once
    // at construction; per-request lookups stay a plain map access.
    return { boundaryId: entry.id, precompiled: resolveOutputsByTier(entry) };
  }

  if (config.boundaryId && config.compile) {
    return { boundaryId: config.boundaryId };
  }

  throw new Error(
    'cloudflareMiddleware needs either a build-derived `manifest` (import { boundaries } from "virtual:czap/boundaries") ' +
      'or the hand-built escape hatch (`boundaryId` from Boundary.make plus a `compile` callback). ' +
      'Neither was provided completely. Fix: pass `manifest: boundaries` -- the build derives the id and outputs for you.',
  );
}

/**
 * Astro middleware factory wired for Cloudflare Workers KV boundary caching.
 *
 * The boundary identity and precompiled outputs come from the
 * build-derived manifest (`virtual:czap/boundaries`), so no id is ever
 * hand-typed; `boundaryId` + `compile` remain as an escape hatch for
 * custom hosts.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { cloudflareMiddleware } from '@czap/cloudflare';
 * import { boundaries } from 'virtual:czap/boundaries';
 *
 * export const onRequest = cloudflareMiddleware({
 *   binding: 'CZAP_BOUNDARY_CACHE',
 *   manifest: boundaries,
 *   boundary: 'viewport',
 * });
 * ```
 */
export function cloudflareMiddleware(config: CloudflareMiddlewareConfig): ReturnType<typeof czapMiddleware> {
  const envSource = resolveEnvSource(config);
  const kv = createCloudflareEdgeCache(envSource, { binding: config.binding });
  const { boundaryId, precompiled } = resolveCacheSource(config);
  const inner = czapMiddleware({
    edge: {
      cache: {
        kv,
        boundaryId,
        precompiled,
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

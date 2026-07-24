/**
 * `liteshipFetchLayer` — request-time adaptation as a fetch LAYER in front of Astro.
 *
 * {@link liteshipMiddleware} runs *inside* the Astro page pipeline as a `pre`
 * middleware: it can only act after Astro has decided to handle the request,
 * and it always calls `next()` to continue into rendering. That makes it
 * structurally unable to serve a response *instead of* invoking Astro.
 *
 * Astro 7's advanced routing (`src/fetch.ts` + `astro/fetch`) lets a handler
 * sit in FRONT of the page pipeline. `liteshipFetchLayer` is a thin layer for that
 * seam. It calls the **same** `createEdgeHostAdapter().resolve()` the
 * middleware does (one resolution implementation, two presentation shells — the
 * fetch layer adds NO cache code, so ADR-0017's key/identity invariants are
 * untouched by construction), and then either:
 *
 *  - **edge serve** — serves the compiled boundary CSS straight from the edge and
 *    returns WITHOUT calling `next()`, so Astro is skipped entirely on the
 *    most frequent adaptive responses; or
 *  - **pass through** — calls `next(request)` and decorates the response with
 *    the Client-Hints / COOP-COEP headers, exactly as the middleware does.
 *
 * The layer is a plain `(request, next)` function: framework-agnostic, trivially
 * composed into a `Fetchable` (`src/fetch.ts`), and Hono-compatible (Astro's own
 * `astro/hono` layers use the same Request-in / Response-out shape). The
 * existing `liteshipMiddleware` stays the zero-config default for Astro pages; this
 * is the opt-in front-of-pipeline path.
 *
 * @module
 */

import { ClientHints, createEdgeHostAdapter } from '@liteship/edge';
import type { CompiledOutputs, EdgeHostResolution } from '@liteship/edge';
import { applyLiteshipHeaders } from './headers.js';
import { applyResponsiveMediaVary } from './responsive-media.js';
import { consumeIntegrationToggles } from './integration-toggles.js';
import type { LiteshipRuntimeToggles } from './integration-toggles.js';
import type { LiteshipMiddlewareConfig } from './middleware.js';

/**
 * The downstream handler a layer wraps — typically the Astro pipeline
 * (`(req) => astro(new FetchState(req))` from `astro/fetch`). Mirrors Astro 7's
 * own `FetchHandler` shape (`(request) => Response | Promise<Response>`).
 */
export type FetchLayerNext = (request: Request) => Response | Promise<Response>;

/** The composed layer returned by {@link liteshipFetchLayer}. */
export type LiteshipFetchLayer = (request: Request, next: FetchLayerNext) => Promise<Response>;

/**
 * Options for {@link liteshipFetchLayer}. Extends {@link LiteshipMiddlewareConfig} so the
 * `edge` / `detect` / `workers` surface is shared verbatim — a consumer migrates
 * from middleware to layer by swapping the factory, not relearning config.
 */
export interface LiteshipFetchLayerConfig extends LiteshipMiddlewareConfig {
  /**
   * Edge-serve predicate. Given the request and the resolution, decide whether to
   * serve the boundary CSS straight from the edge (returning WITHOUT invoking
   * Astro) instead of passing through to `next()`. Default: never — the layer
   * always passes through until a consumer opts edge serve in (e.g.
   * `(req) => req.headers.get('Sec-Fetch-Dest') === 'style'`).
   */
  readonly serveFromEdge?: (request: Request, resolution: EdgeHostResolution) => boolean;
  /**
   * How to render the edge-served Response from a resolution. Default:
   * {@link serializeBoundaryCss} wrapped in a `text/css` Response. Override to
   * match a specific page's exact inlining.
   */
  readonly render?: (resolution: EdgeHostResolution) => Response;
}

/**
 * Serialize a resolution's compiled boundary outputs into one stylesheet.
 *
 * LAW 13 (SKILL §13): `CompiledOutputs.css` is the full ordered stylesheet —
 * `propertyRegistrations` / `containerQueries` are mirrors for KV identity,
 * not additive serialization parts. Emit only `css`.
 */
export function serializeBoundaryCss(resolution: EdgeHostResolution): string {
  const parts: string[] = [];
  if (resolution.theme?.css) parts.push(resolution.theme.css);

  const appendOutputs = (outputs: CompiledOutputs): void => {
    if (outputs.css) parts.push(outputs.css);
  };

  if (resolution.boundaries && Object.keys(resolution.boundaries).length > 0) {
    for (const boundary of Object.values(resolution.boundaries)) {
      if (boundary.compiledOutputs) appendOutputs(boundary.compiledOutputs);
    }
  } else if (resolution.compiledOutputs) {
    appendOutputs(resolution.compiledOutputs);
  }
  return parts.join('\n');
}

/** Default edge-serve render: the serialized boundary CSS as a `text/css` document. */
function defaultRender(resolution: EdgeHostResolution): Response {
  return new Response(serializeBoundaryCss(resolution), {
    status: 200,
    headers: { 'content-type': 'text/css; charset=utf-8' },
  });
}

/**
 * Re-emit `response` with the liteship Client-Hints / COOP-COEP headers applied, so
 * both the edge-serve and pass-through responses ask the browser for the hints
 * tier detection needs next navigation. Mirrors {@link liteshipMiddleware}'s
 * response decoration; the resolution's `responseHeaders` win when present.
 *
 * `mergeResponsiveMediaVary` merges the Save-Data / DPR axis into `Vary` exactly as
 * `liteshipMiddleware` does — set ONLY on the pass-through (Astro HTML) path, since that is
 * the response that can carry `responsiveMedia()` output whose srcset changes per client
 * (F-RM-3). The edge-serve path returns boundary CSS with no responsive-media output, so
 * it omits the axis and stays cache-shared across clients.
 */
function withLiteshipHeaders(
  response: Response,
  resolution: EdgeHostResolution | null,
  toggles: LiteshipRuntimeToggles,
  mergeResponsiveMediaVary: boolean,
): Response {
  const headers = applyLiteshipHeaders(new Headers(response.headers), {
    detectEnabled: toggles.detectEnabled,
    workersEnabled: toggles.workersEnabled,
    ...(toggles.coep ? { coep: toggles.coep } : {}),
    acceptCH: resolution?.responseHeaders.acceptCH ?? ClientHints.acceptCHHeader(),
    criticalCH: resolution?.responseHeaders.criticalCH ?? ClientHints.criticalCHHeader(),
  });
  if (mergeResponsiveMediaVary) applyResponsiveMediaVary(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create the liteship fetch layer.
 *
 * @example
 * ```ts
 * // src/fetch.ts (Astro 7 advanced routing) — the module's default export is a
 * // Fetchable that runs the layer in front of the Astro pipeline.
 * import { FetchState, astro } from 'astro/fetch';
 * import { liteshipFetchLayer } from '@liteship/astro/fetch-layer';
 * import type { EdgeHostCacheConfig, KVNamespace } from '@liteship/edge';
 *
 * declare const env: { LITESHIP_BOUNDARY_CACHE: KVNamespace };
 * declare const boundaries: EdgeHostCacheConfig['boundaries'];
 *
 * const layer = liteshipFetchLayer({
 *   edge: { cache: { kv: env.LITESHIP_BOUNDARY_CACHE, boundaries } },
 *   serveFromEdge: (req) => req.headers.get('Sec-Fetch-Dest') === 'style',
 * });
 *
 * const handler = {
 *   fetch: (request) => layer(request, (req) => astro(new FetchState(req))),
 * } satisfies import('astro').Fetchable;
 * // Export `handler` from src/fetch.ts.
 * ```
 */
export function liteshipFetchLayer(config?: LiteshipFetchLayerConfig): LiteshipFetchLayer {
  const edgeConfig = config?.edge;
  const edgeAdapter = edgeConfig ? createEdgeHostAdapter(edgeConfig) : null;
  const toggles = consumeIntegrationToggles(config);
  const serveFromEdge = config?.serveFromEdge;
  const render = config?.render ?? defaultRender;

  return async (request: Request, next: FetchLayerNext): Promise<Response> => {
    const resolution = edgeAdapter ? await edgeAdapter.resolve(request.headers) : null;

    // Edge serve: serve the boundary CSS from the edge and skip Astro entirely. No
    // responsive-media output rides a CSS response, so it does not advertise that Vary axis.
    if (resolution && serveFromEdge?.(request, resolution)) {
      return withLiteshipHeaders(render(resolution), resolution, toggles, false);
    }

    // Pass through: run the downstream (Astro) pipeline, then decorate headers. This HTML can
    // carry `responsiveMedia()` output, so it merges the Save-Data / DPR Vary axis (F-RM-3).
    const downstream = await next(request);
    return withLiteshipHeaders(downstream, resolution, toggles, true);
  };
}

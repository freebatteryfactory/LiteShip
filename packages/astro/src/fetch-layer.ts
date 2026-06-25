/**
 * `czapFetchLayer` — request-time adaptation as a fetch LAYER in front of Astro.
 *
 * {@link czapMiddleware} runs *inside* the Astro page pipeline as a `pre`
 * middleware: it can only act after Astro has decided to handle the request,
 * and it always calls `next()` to continue into rendering. That makes it
 * structurally unable to serve a response *instead of* invoking Astro.
 *
 * Astro 7's advanced routing (`src/fetch.ts` + `astro/fetch`) lets a handler
 * sit in FRONT of the page pipeline. `czapFetchLayer` is a thin layer for that
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
 * existing `czapMiddleware` stays the zero-config default for Astro pages; this
 * is the opt-in front-of-pipeline path.
 *
 * @module
 */

import { ClientHints, createEdgeHostAdapter } from '@czap/edge';
import type { CompiledOutputs, EdgeHostResolution } from '@czap/edge';
import { applyCzapHeaders } from './headers.js';
import { consumeIntegrationToggles } from './integration-toggles.js';
import type { CzapRuntimeToggles } from './integration-toggles.js';
import type { CzapMiddlewareConfig } from './middleware.js';

/**
 * The downstream handler a layer wraps — typically the Astro pipeline
 * (`(req) => astro(new FetchState(req))` from `astro/fetch`). Mirrors Astro 7's
 * own `FetchHandler` shape (`(request) => Response | Promise<Response>`).
 */
export type FetchLayerNext = (request: Request) => Response | Promise<Response>;

/** The composed layer returned by {@link czapFetchLayer}. */
export type CzapFetchLayer = (request: Request, next: FetchLayerNext) => Promise<Response>;

/**
 * Options for {@link czapFetchLayer}. Extends {@link CzapMiddlewareConfig} so the
 * `edge` / `detect` / `workers` surface is shared verbatim — a consumer migrates
 * from middleware to layer by swapping the factory, not relearning config.
 */
export interface CzapFetchLayerConfig extends CzapMiddlewareConfig {
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
 * Serialize a resolution's compiled boundary outputs into one stylesheet, in
 * CSS-correct order: the theme `:root {}` custom properties first, then per
 * boundary the `@property` registrations (must precede the rules that consume
 * them), the `@container` queries (carry their own containment), and finally the
 * boundary CSS. Handles both the sole-boundary (`compiledOutputs`) and
 * multi-boundary (`boundaries`) resolution forms.
 *
 * This is the edge-served form of the same outputs a page inlines; exposed and
 * tested directly so the edge-served render is not a hidden mirror.
 */
export function serializeBoundaryCss(resolution: EdgeHostResolution): string {
  const parts: string[] = [];
  if (resolution.theme?.css) parts.push(resolution.theme.css);

  const appendOutputs = (outputs: CompiledOutputs): void => {
    if (outputs.propertyRegistrations) parts.push(outputs.propertyRegistrations);
    if (outputs.containerQueries) parts.push(outputs.containerQueries);
    if (outputs.css) parts.push(outputs.css);
  };

  if (resolution.compiledOutputs) {
    appendOutputs(resolution.compiledOutputs);
  }
  if (resolution.boundaries) {
    for (const boundary of Object.values(resolution.boundaries)) {
      if (boundary.compiledOutputs) appendOutputs(boundary.compiledOutputs);
    }
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
 * Re-emit `response` with the czap Client-Hints / COOP-COEP headers applied, so
 * both the edge-serve and pass-through responses ask the browser for the hints
 * tier detection needs next navigation. Mirrors {@link czapMiddleware}'s
 * response decoration; the resolution's `responseHeaders` win when present.
 */
function withCzapHeaders(
  response: Response,
  resolution: EdgeHostResolution | null,
  toggles: CzapRuntimeToggles,
): Response {
  const headers = applyCzapHeaders(new Headers(response.headers), {
    detectEnabled: toggles.detectEnabled,
    workersEnabled: toggles.workersEnabled,
    ...(toggles.coep ? { coep: toggles.coep } : {}),
    acceptCH: resolution?.responseHeaders.acceptCH ?? ClientHints.acceptCHHeader(),
    criticalCH: resolution?.responseHeaders.criticalCH ?? ClientHints.criticalCHHeader(),
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create the czap fetch layer.
 *
 * @example
 * ```ts
 * // src/fetch.ts (Astro 7 advanced routing) — the module's default export is a
 * // Fetchable that runs the layer in front of the Astro pipeline.
 * import { FetchState, astro } from 'astro/fetch';
 * import { czapFetchLayer } from '@czap/astro/fetch-layer';
 *
 * const layer = czapFetchLayer({
 *   edge: { cache: { kv: env.CZAP_BOUNDARY_CACHE, boundaries } },
 *   serveFromEdge: (req) => req.headers.get('Sec-Fetch-Dest') === 'style',
 * });
 *
 * const handler = {
 *   fetch: (request) => layer(request, (req) => astro(new FetchState(req))),
 * } satisfies import('astro').Fetchable;
 * // `handler` is then the default export of src/fetch.ts.
 * ```
 */
export function czapFetchLayer(config?: CzapFetchLayerConfig): CzapFetchLayer {
  const edgeConfig = config?.edge;
  const edgeAdapter = edgeConfig ? createEdgeHostAdapter(edgeConfig) : null;
  const toggles = consumeIntegrationToggles(config);
  const serveFromEdge = config?.serveFromEdge;
  const render = config?.render ?? defaultRender;

  return async (request: Request, next: FetchLayerNext): Promise<Response> => {
    const resolution = edgeAdapter ? await edgeAdapter.resolve(request.headers) : null;

    // Edge serve: serve the boundary CSS from the edge and skip Astro entirely.
    if (resolution && serveFromEdge?.(request, resolution)) {
      return withCzapHeaders(render(resolution), resolution, toggles);
    }

    // Pass through: run the downstream (Astro) pipeline, then decorate headers.
    const downstream = await next(request);
    return withCzapHeaders(downstream, resolution, toggles);
  };
}

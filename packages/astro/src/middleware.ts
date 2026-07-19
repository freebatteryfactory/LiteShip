/**
 * Edge middleware -- Client Hints parsing, tier detection, response headers.
 *
 * Framework-agnostic handler compatible with Astro middleware,
 * Cloudflare Workers, and Express/Vite dev server.
 *
 * @module
 */

import { ClientHints, createEdgeHostAdapter, EdgeTier } from '@liteship/edge';
import type {
  CompiledOutputs,
  EdgeHostAdapterConfig,
  EdgeHostBoundaryResolution,
  EdgeHostCacheStatus,
  ThemeCompileResult,
} from '@liteship/edge';
import { projectResponsiveMediaPicture } from '@liteship/core';
import type { CapTier, ResponsiveMediaIntent, ResponsiveMediaPictureProjection } from '@liteship/core';
import type { DesignTier, ExtendedDeviceCapabilities, MotionTier } from '@liteship/detect';
import { applyLiteshipHeaders } from './headers.js';
import type { CrossOriginEmbedderPolicy } from './headers.js';
import { applyResponsiveMediaVary } from './responsive-media.js';
import { consumeIntegrationToggles } from './integration-toggles.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of `context.locals.liteship` injected by {@link liteshipMiddleware}.
 * Astro components (and downstream middleware) read this to drive
 * adaptive rendering decisions.
 */
export interface LiteshipLocals {
  /**
   * Resolved capability tiers keyed by axis. Each field projects to the
   * matching `data-liteship-<axis>` attribute on `<html>` — the field name and the
   * attribute name are the same CapAxis key (one source: `CAP_AXES` from
   * `@liteship/detect`), so they can never disagree.
   */
  readonly tiers: Readonly<{
    readonly tier: CapTier;
    readonly motion: MotionTier;
    readonly design: DesignTier;
  }>;
  /** Parsed device capabilities. */
  readonly capabilities: ExtendedDeviceCapabilities;
  /**
   * Project a responsive-media intent using THIS request's Save-Data / DPR caps
   * (derived from Client Hints). Every artifact of the returned projection derives
   * from the ONE effective-candidate law (`selectCandidates`), so a Save-Data client
   * is never advertised a heavy candidate through `src` / `srcset` / `<source>` /
   * the preload `imagesrcset`. The middleware also merges the responsive-media `Vary`
   * axis (`Sec-CH-DPR, Save-Data`) into the response so a CDN keys the light and
   * normal representations apart (#140).
   */
  readonly responsiveMedia: (intent: ResponsiveMediaIntent) => ResponsiveMediaPictureProjection;
  /** Edge-host resolution result, present when an edge adapter is configured. */
  readonly edge?: {
    readonly theme?: ThemeCompileResult;
    /** Sole boundary's outputs; undefined when multiple boundaries are configured. */
    readonly compiledOutputs?: CompiledOutputs;
    /** Sole boundary's immutable static CSS asset URL, when emitted by the build. */
    readonly assetUrl?: string;
    /** Per-boundary outcomes, keyed by name (multi-boundary cache form). */
    readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryResolution>>;
    readonly htmlAttributes: string;
    /** Spreadable `data-liteship-<axis>` map for `<html {...htmlAttributesMap}>`. */
    readonly htmlAttributesMap: Readonly<Record<string, string>>;
    readonly cacheStatus: EdgeHostCacheStatus;
  };
}

declare global {
  namespace App {
    interface Locals {
      /**
       * Capability detection injected by `liteshipMiddleware`. Importing
       * `@liteship/astro` pulls in this `App.Locals` augmentation, so
       * `Astro.locals.liteship` is typed end-to-end (no cast needed).
       */
      liteship?: LiteshipLocals;
    }
  }
}

/**
 * Options accepted by {@link liteshipMiddleware}.
 *
 * Omit `edge` to run in pure Client-Hints mode. Pass `edge` when you
 * have an `@liteship/edge` host adapter (KV cache, theme compilation).
 */
export interface LiteshipMiddlewareConfig {
  /** Edge host adapter configuration (KV cache, theme compilation). */
  readonly edge?: EdgeHostAdapterConfig;
  /** Whether to include the Client Hints request headers (default `true`). */
  readonly detect?: boolean;
  /**
   * Whether to emit COOP/COEP headers for worker features. `coep`
   * selects the embedder policy value (default `'require-corp'`);
   * `'credentialless'` keeps cross-origin isolation while tolerating
   * CORP-less third-party assets.
   */
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
}

interface MiddlewareContext {
  readonly request: Request;
  locals: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Create the liteship edge middleware.
 *
 * Parses Client Hints from request headers, computes tier detection,
 * injects results into `context.locals.liteship`, and sets Client Hints
 * response headers (`Accept-CH`, `Critical-CH`).
 *
 * @example
 * ```ts
 * // Astro middleware (src/middleware.ts)
 * import { liteshipMiddleware } from '@liteship/astro';
 * export const onRequest = liteshipMiddleware();
 * ```
 */
export function liteshipMiddleware(
  config?: LiteshipMiddlewareConfig,
): (context: MiddlewareContext, next: () => Promise<Response>) => Promise<Response> {
  const edgeConfig = config?.edge;
  let edgeAdapter: ReturnType<typeof createEdgeHostAdapter> | null = null;
  if (edgeConfig) {
    edgeAdapter = createEdgeHostAdapter(edgeConfig);
  }
  const toggles = consumeIntegrationToggles(config);
  const detectEnabled = toggles.detectEnabled;
  const workersEnabled = toggles.workersEnabled;
  const coep = toggles.coep;

  return async (context: MiddlewareContext, next: () => Promise<Response>): Promise<Response> => {
    const edgeResolution = edgeAdapter ? await edgeAdapter.resolve(context.request.headers) : null;
    const capabilities = edgeResolution?.capabilities ?? ClientHints.parseClientHints(context.request.headers);
    const tier = edgeResolution?.tier ?? EdgeTier.detectTier(context.request.headers);

    // Save-Data / DPR caps for the responsive-media projector, derived ONCE from the
    // request's real Client Hints (the production wiring of responsiveMediaCapabilities).
    const responsiveMediaCaps = ClientHints.responsiveMediaCapabilities(capabilities);

    // Inject into locals for component access
    context.locals.liteship = {
      tiers: {
        tier: tier.capTier,
        motion: tier.motionTier,
        design: tier.designTier,
      },
      capabilities,
      responsiveMedia: (intent: ResponsiveMediaIntent): ResponsiveMediaPictureProjection =>
        projectResponsiveMediaPicture(intent, responsiveMediaCaps),
      ...(edgeResolution
        ? {
            edge: {
              theme: edgeResolution.theme,
              compiledOutputs: edgeResolution.compiledOutputs,
              assetUrl: edgeResolution.assetUrl,
              boundaries: edgeResolution.boundaries,
              htmlAttributes: edgeResolution.htmlAttributes,
              htmlAttributesMap: edgeResolution.htmlAttributesMap,
              cacheStatus: edgeResolution.cacheStatus,
            },
          }
        : {}),
    } satisfies LiteshipLocals;

    // Continue to the route handler
    const response = await next();

    // Add Client Hints request headers to the response
    const headers = applyLiteshipHeaders(new Headers(response.headers), {
      detectEnabled,
      workersEnabled,
      ...(coep ? { coep } : {}),
      acceptCH: edgeResolution?.responseHeaders.acceptCH ?? ClientHints.acceptCHHeader(),
      criticalCH: edgeResolution?.responseHeaders.criticalCH ?? ClientHints.criticalCHHeader(),
    });

    // Responsive-media representations vary by Save-Data / DPR — merge that axis into
    // the response Vary (union, never clobber) so a CDN keys the light and normal
    // srcsets apart. The production caller of responsiveMediaVaryHeader (#140).
    //
    // NOT gated on `detectEnabled`: `responsiveMedia()` is injected on `locals` for
    // EVERY request and projects from `responsiveMediaCaps`, which is parsed from the
    // request's real Client Hints regardless of detection (Save-Data is sent by
    // data-saver browsers unprompted, never behind Accept-CH). So any page that renders
    // through `Astro.locals.liteship.responsiveMedia(intent)` can emit a Save-Data/DPR-
    // specific srcset even with detect off — the Vary MUST advertise that axis or a CDN
    // serves one variant under a shared cache key (F-RM-3).
    applyResponsiveMediaVary(headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

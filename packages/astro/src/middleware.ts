/**
 * Edge middleware -- Client Hints parsing, tier detection, response headers.
 *
 * Framework-agnostic handler compatible with Astro middleware,
 * Cloudflare Workers, and Express/Vite dev server.
 *
 * @module
 */

import { ClientHints, createEdgeHostAdapter, EdgeTier } from '@czap/edge';
import type {
  CompiledOutputs,
  EdgeHostAdapterConfig,
  EdgeHostBoundaryResolution,
  EdgeHostCacheStatus,
  ThemeCompileResult,
} from '@czap/edge';
import type { CapAxis, ExtendedDeviceCapabilities } from '@czap/detect';
import { applyCzapHeaders } from './headers.js';
import type { CrossOriginEmbedderPolicy } from './headers.js';
import { consumeIntegrationToggles } from './integration-toggles.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of `context.locals.czap` injected by {@link czapMiddleware}.
 * Astro components (and downstream middleware) read this to drive
 * adaptive rendering decisions.
 */
export interface CzapLocals {
  /**
   * Resolved capability tiers keyed by axis. Each field projects to the
   * matching `data-czap-<axis>` attribute on `<html>` — the field name and the
   * attribute name are the same {@link CapAxis} key (one source: `CAP_AXES`),
   * so they can never disagree.
   */
  readonly tiers: Readonly<Record<CapAxis, string>>;
  /** Parsed device capabilities. */
  readonly capabilities: ExtendedDeviceCapabilities;
  /** Edge-host resolution result, present when an edge adapter is configured. */
  readonly edge?: {
    readonly theme?: ThemeCompileResult;
    /** Sole boundary's outputs; undefined when multiple boundaries are configured. */
    readonly compiledOutputs?: CompiledOutputs;
    /** Per-boundary outcomes, keyed by name (multi-boundary cache form). */
    readonly boundaries?: Readonly<Record<string, EdgeHostBoundaryResolution>>;
    readonly htmlAttributes: string;
    readonly cacheStatus: EdgeHostCacheStatus;
  };
}

declare global {
  namespace App {
    interface Locals {
      /**
       * Capability detection injected by `czapMiddleware`. Importing
       * `@czap/astro` pulls in this `App.Locals` augmentation, so
       * `Astro.locals.czap` is typed end-to-end (no cast needed).
       */
      czap?: CzapLocals;
    }
  }
}

/**
 * Options accepted by {@link czapMiddleware}.
 *
 * Omit `edge` to run in pure Client-Hints mode. Pass `edge` when you
 * have an `@czap/edge` host adapter (KV cache, theme compilation).
 */
export interface CzapMiddlewareConfig {
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
 * Create the czap edge middleware.
 *
 * Parses Client Hints from request headers, computes tier detection,
 * injects results into `context.locals.czap`, and sets Client Hints
 * response headers (`Accept-CH`, `Critical-CH`).
 *
 * @example
 * ```ts
 * // Astro middleware (src/middleware.ts)
 * import { czapMiddleware } from '@czap/astro';
 * export const onRequest = czapMiddleware();
 * ```
 */
export function czapMiddleware(
  config?: CzapMiddlewareConfig,
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

    // Inject into locals for component access
    context.locals.czap = {
      tiers: {
        tier: tier.capTier,
        motion: tier.motionTier,
        design: tier.designTier,
      },
      capabilities,
      ...(edgeResolution
        ? {
            edge: {
              theme: edgeResolution.theme,
              compiledOutputs: edgeResolution.compiledOutputs,
              boundaries: edgeResolution.boundaries,
              htmlAttributes: edgeResolution.htmlAttributes,
              cacheStatus: edgeResolution.cacheStatus,
            },
          }
        : {}),
    } satisfies CzapLocals;

    // Continue to the route handler
    const response = await next();

    // Add Client Hints request headers to the response
    const headers = applyCzapHeaders(new Headers(response.headers), {
      detectEnabled,
      workersEnabled,
      ...(coep ? { coep } : {}),
      acceptCH: edgeResolution?.responseHeaders.acceptCH ?? ClientHints.acceptCHHeader(),
      criticalCH: edgeResolution?.responseHeaders.criticalCH ?? ClientHints.criticalCHHeader(),
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

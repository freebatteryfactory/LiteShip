/**
 * `@czap/astro` — **LiteShip** on Astro 7: constraint-shaped adaptive
 * projection hosted as islands and directives.
 *
 * Provides the Astro `Integration` that registers `@czap/vite`,
 * injects client tier detection, **rigs** the `client:satellite` directive,
 * and exposes `Satellite` for shells with server-resolved bearings.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { defineConfig } from 'astro/config';
 * import { czap } from '@czap/astro';
 *
 * const config = defineConfig({
 *   integrations: [czap({ detect: true, workers: { enabled: true } })],
 * });
 * ```
 *
 * @module
 */

export type { IntegrationConfig } from './integration.js';
export { integration } from './integration.js';
export { integration as czap } from './integration.js';
export type { ServerIslandContext, QuantizeProps, ResolvedInitialState } from './quantize.js';
export { resolveInitialState, resolveInitialStateWithReceipt } from './quantize.js';
export { satelliteAttrs, resolveInitialStateFallback } from './Satellite.js';
export type { SatelliteProps } from './Satellite.js';
export { czapMiddleware } from './middleware.js';
export type { CzapLocals, CzapMiddlewareConfig } from './middleware.js';
// Responsive-media host projection (#140): the production wiring of the edge
// Save-Data/DPR caps + responsive Vary. `Astro.locals.czap.responsiveMedia(intent)`
// is the ergonomic form; these are the standalone helpers for route handlers.
export { projectResponsiveMediaForRequest, applyResponsiveMediaVary } from './responsive-media.js';
export type { ResponsiveMediaCapsSource, ResponsiveMediaHostProjection } from './responsive-media.js';
export { czapFetchLayer, serializeBoundaryCss } from './fetch-layer.js';
export type { CzapFetchLayer, CzapFetchLayerConfig, FetchLayerNext } from './fetch-layer.js';
// Client→server graph-mutation channel: the host route adapter over @czap/core's
// `handleGraphMutation`. `POST: APIRoute = ({request}) => graphMutationRoute(store)(request)`.
export { graphMutationRoute } from './graph-mutation-route.js';
export { graphQueryRoute, parseGraphQueryIfNoneMatch } from './graph-query-route.js';
export { docsMcpRoute, loadDocsMcpBundle } from './docs-mcp-route.js';
export type { DocsBundleManifest, DocsMcpBundle } from './docs-mcp-route.js';
export { bridgeDiagnosticsToAstroLogger, installDiagnosticsBridge } from './diagnostics-bridge.js';
export type { AstroLoggerLike } from './diagnostics-bridge.js';
export type { CrossOriginEmbedderPolicy } from './headers.js';

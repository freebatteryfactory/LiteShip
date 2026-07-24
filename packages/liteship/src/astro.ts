/**
 * `liteship/astro` — the curated facade over `@liteship/astro`: LiteShip on
 * Astro 7. The `integration` (aliased `liteship`) that registers `@liteship/vite`,
 * injects client tier detection and rigs the `client:adaptive` directive, the
 * `Adaptive` shell helpers (`adaptiveAttrs`), server-island initial-state
 * resolution, the middleware, the responsive-media host projection, the fetch
 * layer, the graph mutation/query route adapters, the docs-MCP route, and the
 * diagnostics bridge. Curated named re-exports only — no behavior lives here.
 *
 * Importing this subpath evaluates `@liteship/astro`, which carries an `astro` peer
 * expectation (declared OPTIONAL on `liteship`). The root `liteship` entry never
 * reaches this module — the subpath module graphs are independent — so a
 * vite-only app pays no astro cost.
 * @module
 */

export type { IntegrationConfig } from '@liteship/astro';
export { integration } from '@liteship/astro';
export { integration as liteship } from '@liteship/astro';

export type { ServerIslandContext, QuantizeProps, ResolvedInitialState } from '@liteship/astro';
export { resolveInitialState, resolveInitialStateWithReceipt } from '@liteship/astro';

export { adaptiveAttrs, resolveInitialStateFallback } from '@liteship/astro';
export type { AdaptiveProps } from '@liteship/astro';

export { liteshipMiddleware } from '@liteship/astro';
export type { LiteshipLocals, LiteshipMiddlewareConfig } from '@liteship/astro';

export { projectResponsiveMediaForRequest, applyResponsiveMediaVary } from '@liteship/astro';
export type { ResponsiveMediaCapsSource, ResponsiveMediaHostProjection } from '@liteship/astro';

export { liteshipFetchLayer, serializeBoundaryCss } from '@liteship/astro';
export type { LiteshipFetchLayer, LiteshipFetchLayerConfig, FetchLayerNext } from '@liteship/astro';

export { graphMutationRoute } from '@liteship/astro';
export { graphQueryRoute, parseGraphQueryIfNoneMatch } from '@liteship/astro';

export { docsMcpRoute, loadDocsMcpBundle } from '@liteship/astro';
export type { DocsBundleManifest, DocsMcpBundle } from '@liteship/astro';

export { bridgeDiagnosticsToAstroLogger, installDiagnosticsBridge } from '@liteship/astro';
export type { AstroLoggerLike } from '@liteship/astro';

// Curated browser-session entry used by the generated-UI guide. The implementation
// remains owned by @liteship/astro/runtime; this host subpath only re-exports it.
export { createLLMSession } from '@liteship/astro/runtime';
export type { LLMSessionConfig, LLMSessionShape } from '@liteship/astro/runtime';

export type { CrossOriginEmbedderPolicy } from '@liteship/astro';

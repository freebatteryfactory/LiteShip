[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/astro

# liteship/src/astro

`liteship/astro` — the curated facade over `@liteship/astro`: LiteShip on
Astro 7. The `integration` (aliased `liteship`) that registers `@liteship/vite`,
injects client tier detection and rigs the `client:adaptive` directive, the
`Adaptive` shell helpers (`adaptiveAttrs`), server-island initial-state
resolution, the middleware, the responsive-media host projection, the fetch
layer, the graph mutation/query route adapters, the docs-MCP route, and the
diagnostics bridge. Curated named re-exports only — no behavior lives here.

Importing this subpath evaluates `@liteship/astro`, which carries an `astro` peer
expectation (declared OPTIONAL on `liteship`). The root `liteship` entry never
reaches this module — the subpath module graphs are independent — so a
vite-only app pays no astro cost.

## Interfaces

- [AdaptiveProps](interfaces/AdaptiveProps.md)
- [AstroLoggerLike](interfaces/AstroLoggerLike.md)
- [DocsBundleManifest](interfaces/DocsBundleManifest.md)
- [DocsMcpBundle](interfaces/DocsMcpBundle.md)
- [IntegrationConfig](interfaces/IntegrationConfig.md)
- [LiteshipFetchLayerConfig](interfaces/LiteshipFetchLayerConfig.md)
- [LiteshipLocals](interfaces/LiteshipLocals.md)
- [LiteshipMiddlewareConfig](interfaces/LiteshipMiddlewareConfig.md)
- [LLMSessionConfig](interfaces/LLMSessionConfig.md)
- [LLMSessionShape](interfaces/LLMSessionShape.md)
- [QuantizeProps](interfaces/QuantizeProps.md)
- [ResolvedInitialState](interfaces/ResolvedInitialState.md)
- [ResponsiveMediaHostProjection](interfaces/ResponsiveMediaHostProjection.md)
- [ServerIslandContext](interfaces/ServerIslandContext.md)

## Type Aliases

- [FetchLayerNext](type-aliases/FetchLayerNext.md)
- [LiteshipFetchLayer](type-aliases/LiteshipFetchLayer.md)
- [ResponsiveMediaCapsSource](type-aliases/ResponsiveMediaCapsSource.md)

## Variables

- [parseGraphQueryIfNoneMatch](variables/parseGraphQueryIfNoneMatch.md)

## Functions

- [adaptiveAttrs](functions/adaptiveAttrs.md)
- [applyResponsiveMediaVary](functions/applyResponsiveMediaVary.md)
- [bridgeDiagnosticsToAstroLogger](functions/bridgeDiagnosticsToAstroLogger.md)
- [createLLMSession](functions/createLLMSession.md)
- [docsMcpRoute](functions/docsMcpRoute.md)
- [graphMutationRoute](functions/graphMutationRoute.md)
- [graphQueryRoute](functions/graphQueryRoute.md)
- [installDiagnosticsBridge](functions/installDiagnosticsBridge.md)
- [integration](functions/integration.md)
- [liteshipFetchLayer](functions/liteshipFetchLayer.md)
- [liteshipMiddleware](functions/liteshipMiddleware.md)
- [loadDocsMcpBundle](functions/loadDocsMcpBundle.md)
- [projectResponsiveMediaForRequest](functions/projectResponsiveMediaForRequest.md)
- [resolveInitialState](functions/resolveInitialState.md)
- [resolveInitialStateFallback](functions/resolveInitialStateFallback.md)
- [resolveInitialStateWithReceipt](functions/resolveInitialStateWithReceipt.md)
- [serializeBoundaryCss](functions/serializeBoundaryCss.md)

## References

### CrossOriginEmbedderPolicy

Re-exports [CrossOriginEmbedderPolicy](../../../astro/src/type-aliases/CrossOriginEmbedderPolicy.md)

***

### liteship

Renames and re-exports [integration](functions/integration.md)

[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / astro/src

# astro/src

`@liteship/astro` — **LiteShip** on Astro 7: constraint-shaped adaptive
projection hosted as islands and directives.

Provides the Astro `Integration` that registers `@liteship/vite`,
injects client tier detection, **rigs** the `client:adaptive` directive,
and exposes `Adaptive` for shells with server-resolved bearings.

## Example

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { liteship } from '@liteship/astro';

const config = defineConfig({
  integrations: [liteship({ detect: true, workers: { enabled: true } })],
});
```

## Interfaces

- [AdaptiveProps](interfaces/AdaptiveProps.md)
- [AstroLoggerLike](interfaces/AstroLoggerLike.md)
- [DocsBundleManifest](interfaces/DocsBundleManifest.md)
- [DocsMcpBundle](interfaces/DocsMcpBundle.md)
- [IntegrationConfig](interfaces/IntegrationConfig.md)
- [LiteshipFetchLayerConfig](interfaces/LiteshipFetchLayerConfig.md)
- [LiteshipLocals](interfaces/LiteshipLocals.md)
- [LiteshipMiddlewareConfig](interfaces/LiteshipMiddlewareConfig.md)
- [QuantizeProps](interfaces/QuantizeProps.md)
- [ResolvedInitialState](interfaces/ResolvedInitialState.md)
- [ResponsiveMediaHostProjection](interfaces/ResponsiveMediaHostProjection.md)
- [ServerIslandContext](interfaces/ServerIslandContext.md)

## Type Aliases

- [CrossOriginEmbedderPolicy](type-aliases/CrossOriginEmbedderPolicy.md)
- [FetchLayerNext](type-aliases/FetchLayerNext.md)
- [LiteshipFetchLayer](type-aliases/LiteshipFetchLayer.md)
- [ResponsiveMediaCapsSource](type-aliases/ResponsiveMediaCapsSource.md)

## Variables

- [parseGraphQueryIfNoneMatch](variables/parseGraphQueryIfNoneMatch.md)

## Functions

- [adaptiveAttrs](functions/adaptiveAttrs.md)
- [applyResponsiveMediaVary](functions/applyResponsiveMediaVary.md)
- [bridgeDiagnosticsToAstroLogger](functions/bridgeDiagnosticsToAstroLogger.md)
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

### liteship

Renames and re-exports [integration](functions/integration.md)

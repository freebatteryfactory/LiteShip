[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / astro/src

# astro/src

`@czap/astro` — **LiteShip** on Astro 7: constraint-shaped adaptive
projection hosted as islands and directives.

Provides the Astro `Integration` that registers `@czap/vite`,
injects client tier detection, **rigs** the `client:satellite` directive,
and exposes `Satellite` for shells with server-resolved bearings.

## Example

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { czap } from '@czap/astro';

const config = defineConfig({
  integrations: [czap({ detect: true, workers: { enabled: true } })],
});
```

## Interfaces

- [AstroLoggerLike](interfaces/AstroLoggerLike.md)
- [CzapFetchLayerConfig](interfaces/CzapFetchLayerConfig.md)
- [CzapLocals](interfaces/CzapLocals.md)
- [CzapMiddlewareConfig](interfaces/CzapMiddlewareConfig.md)
- [IntegrationConfig](interfaces/IntegrationConfig.md)
- [QuantizeProps](interfaces/QuantizeProps.md)
- [SatelliteProps](interfaces/SatelliteProps.md)
- [ServerIslandContext](interfaces/ServerIslandContext.md)

## Type Aliases

- [CrossOriginEmbedderPolicy](type-aliases/CrossOriginEmbedderPolicy.md)
- [CzapFetchLayer](type-aliases/CzapFetchLayer.md)
- [FetchLayerNext](type-aliases/FetchLayerNext.md)

## Functions

- [bridgeDiagnosticsToAstroLogger](functions/bridgeDiagnosticsToAstroLogger.md)
- [czapFetchLayer](functions/czapFetchLayer.md)
- [czapMiddleware](functions/czapMiddleware.md)
- [graphMutationRoute](functions/graphMutationRoute.md)
- [installDiagnosticsBridge](functions/installDiagnosticsBridge.md)
- [integration](functions/integration.md)
- [resolveInitialState](functions/resolveInitialState.md)
- [resolveInitialStateFallback](functions/resolveInitialStateFallback.md)
- [satelliteAttrs](functions/satelliteAttrs.md)
- [serializeBoundaryCss](functions/serializeBoundaryCss.md)

## References

### czap

Renames and re-exports [integration](functions/integration.md)

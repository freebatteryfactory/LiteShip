[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / installDiagnosticsBridge

# Function: installDiagnosticsBridge()

> **installDiagnosticsBridge**(`logger`): () => `void`

Defined in: [astro/src/diagnostics-bridge.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/diagnostics-bridge.ts#L77)

Install the Astro-logger bridge as the active [Diagnostics](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/variables/Diagnostics.md) sink and
return a restore function that reinstates the prior sink. Called once from the
integration's `astro:config:setup`; the bridge stays installed for the whole
dev/build session.

## Parameters

### logger

[`AstroLoggerLike`](../interfaces/AstroLoggerLike.md)

## Returns

() => `void`

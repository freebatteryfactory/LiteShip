[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / installDiagnosticsBridge

# Function: installDiagnosticsBridge()

> **installDiagnosticsBridge**(`logger`): () => `void`

Defined in: astro/dist/diagnostics-bridge.d.ts:38

Install the Astro-logger bridge as the active `Diagnostics` sink and
return a restore function that reinstates the prior sink. Called once from the
integration's `astro:config:setup`; the bridge stays installed for the whole
dev/build session.

## Parameters

### logger

[`AstroLoggerLike`](../interfaces/AstroLoggerLike.md)

## Returns

() => `void`

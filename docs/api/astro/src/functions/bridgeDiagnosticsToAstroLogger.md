[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / bridgeDiagnosticsToAstroLogger

# Function: bridgeDiagnosticsToAstroLogger()

> **bridgeDiagnosticsToAstroLogger**(`logger`): [`DiagnosticsSink`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/DiagnosticsSink.md)

Defined in: [astro/src/diagnostics-bridge.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/diagnostics-bridge.ts#L58)

Build a [DiagnosticsSink](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/DiagnosticsSink.md) that forwards every event to an Astro logger,
mapping `error` → `logger.error` and `warn` → `logger.warn`.

## Parameters

### logger

[`AstroLoggerLike`](../interfaces/AstroLoggerLike.md)

## Returns

[`DiagnosticsSink`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/DiagnosticsSink.md)

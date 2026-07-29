[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/astro](../README.md) / bridgeDiagnosticsToAstroLogger

# Function: bridgeDiagnosticsToAstroLogger()

> **bridgeDiagnosticsToAstroLogger**(`logger`): [`DiagnosticsSink`](../../evidence/interfaces/DiagnosticsSink.md)

Defined in: astro/dist/diagnostics-bridge.d.ts:31

Build a [DiagnosticsSink](../../evidence/interfaces/DiagnosticsSink.md) that forwards every event to an Astro logger,
mapping `error` → `logger.error` and `warn` → `logger.warn`.

## Parameters

### logger

[`AstroLoggerLike`](../interfaces/AstroLoggerLike.md)

## Returns

[`DiagnosticsSink`](../../evidence/interfaces/DiagnosticsSink.md)

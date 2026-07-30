[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / SSEMessage

# Type Alias: SSEMessage

> **SSEMessage** = \{ `data`: `unknown`; `type`: `"patch"`; \} \| \{ `data`: `unknown`; `type`: `"batch"`; \} \| \{ `data`: `unknown`; `type`: `"signal"`; \} \| \{ `data`: `unknown`; `type`: `"receipt"`; \} \| \{ `type`: `"heartbeat"`; \} \| \{ `data`: `unknown`; `type`: `"snapshot"`; \}

Defined in: web/dist/types.d.ts:269

SSE message types received from server.

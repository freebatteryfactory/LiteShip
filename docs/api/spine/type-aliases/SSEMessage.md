[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SSEMessage

# Type Alias: SSEMessage

> **SSEMessage** = \{ `data`: `unknown`; `type`: `"patch"`; \} \| \{ `data`: `unknown`; `type`: `"batch"`; \} \| \{ `data`: `unknown`; `type`: `"signal"`; \} \| \{ `data`: `unknown`; `type`: `"receipt"`; \} \| \{ `type`: `"heartbeat"`; \} \| \{ `data`: `unknown`; `type`: `"snapshot"`; \}

Defined in: [\_spine/web.d.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L282)

Parsed data, heartbeat, or control message received over SSE.

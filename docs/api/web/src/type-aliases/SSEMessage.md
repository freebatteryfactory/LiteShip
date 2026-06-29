[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / SSEMessage

# Type Alias: SSEMessage

> **SSEMessage** = \{ `data`: `unknown`; `type`: `"patch"`; \} \| \{ `data`: `unknown`; `type`: `"batch"`; \} \| \{ `data`: `unknown`; `type`: `"signal"`; \} \| \{ `data`: `unknown`; `type`: `"receipt"`; \} \| \{ `type`: `"heartbeat"`; \} \| \{ `data`: `unknown`; `type`: `"snapshot"`; \}

Defined in: [web/src/types.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L262)

SSE message types received from server.

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ChunkParser

# Type Alias: ChunkParser

> **ChunkParser** = (`event`) => [`LLMChunk`](../interfaces/LLMChunk.md) \| `null`

Defined in: web/dist/stream/llm-adapter.d.ts:22

User-provided function that converts a raw SSE message into an
[LLMChunk](../interfaces/LLMChunk.md) (or `null` to drop it). The adapter calls this
exactly once per incoming message.

## Parameters

### event

[`SSEMessage`](SSEMessage.md)

## Returns

[`LLMChunk`](../interfaces/LLMChunk.md) \| `null`

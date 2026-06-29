[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / LLMStreamConfig

# Interface: LLMStreamConfig

Defined in: [web/src/stream/llm-adapter.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/llm-adapter.ts#L42)

Configuration accepted by [LLMAdapter.create](../variables/LLMAdapter.md#create).

`source` is typically the `messages` stream of an [SSE](../variables/SSE.md) client,
but any `Stream.Stream<SSEMessage>` will do -- including mock streams
in tests.

## Properties

### parser

> `readonly` **parser**: [`ChunkParser`](../type-aliases/ChunkParser.md)

Defined in: [web/src/stream/llm-adapter.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/llm-adapter.ts#L46)

Parser mapping SSE messages to typed LLM chunks.

***

### source

> `readonly` **source**: `Stream`\<[`SSEMessage`](../type-aliases/SSEMessage.md)\>

Defined in: [web/src/stream/llm-adapter.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/llm-adapter.ts#L44)

Stream of parsed SSE messages.

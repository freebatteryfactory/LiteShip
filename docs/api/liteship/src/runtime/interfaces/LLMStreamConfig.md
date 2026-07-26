[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LLMStreamConfig

# Interface: LLMStreamConfig

Defined in: web/dist/stream/llm-adapter.d.ts:30

Configuration accepted by [LLMAdapter.create](../variables/LLMAdapter.md#create).

`source` is typically the `messages` AsyncIterable of an [SSE](../variables/SSE.md) client,
but any `Iterable`/`AsyncIterable` of `SSEMessage` will do -- including plain
arrays in tests. Consumed with `for await`, so both sync and async sources work.

## Properties

### parser

> `readonly` **parser**: [`ChunkParser`](../type-aliases/ChunkParser.md)

Defined in: web/dist/stream/llm-adapter.d.ts:34

Parser mapping SSE messages to typed LLM chunks.

***

### source

> `readonly` **source**: `AsyncIterable`\<[`SSEMessage`](../type-aliases/SSEMessage.md), `any`, `any`\> \| `Iterable`\<[`SSEMessage`](../type-aliases/SSEMessage.md), `any`, `any`\>

Defined in: web/dist/stream/llm-adapter.d.ts:32

Iterable (or AsyncIterable) of parsed SSE messages.

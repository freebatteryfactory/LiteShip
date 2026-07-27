[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LLMAdapter

# Interface: LLMAdapter

Defined in: web/dist/stream/llm-adapter.d.ts:41

Host-facing surface of an LLM adapter. Exposes both the typed
[LLMChunk](LLMChunk.md) stream and the decoded text-token stream derived
from it. Returned by [LLMAdapter.create](../variables/LLMAdapter.md#create).

## Properties

### chunks

> `readonly` **chunks**: `AsyncIterable`\<[`LLMChunk`](LLMChunk.md)\>

Defined in: web/dist/stream/llm-adapter.d.ts:42

***

### textTokens

> `readonly` **textTokens**: `AsyncIterable`\<`string`\>

Defined in: web/dist/stream/llm-adapter.d.ts:43

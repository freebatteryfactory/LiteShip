[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / LLMChunkNormalization

# Variable: LLMChunkNormalization

> `const` **LLMChunkNormalization**: `object`

Defined in: web/dist/stream/llm-chunks.d.ts:55

Pure normalisation helpers for provider-agnostic LLM chunk streams.

`normalize` is the state machine that accumulates tool-call deltas
into a finalised `tool-call-end` chunk; `parseAccumulatedToolArgs`
tries JSON-parsing the concatenated argument fragments and falls
back to the raw string on parse failure.

## Type Declaration

### normalize

> `readonly` **normalize**: *typeof* `normalize`

### parseAccumulatedToolArgs

> `readonly` **parseAccumulatedToolArgs**: *typeof* `parseAccumulatedToolArgs`

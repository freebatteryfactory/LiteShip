[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LLMChunk

# Interface: LLMChunk

Defined in: web/dist/stream/llm-chunks.d.ts:21

One normalised chunk delivered by [LLMAdapter](../namespaces/LLMAdapter/README.md). `partial` flags
streaming deltas that will be superseded by a later, finalised chunk.

## Properties

### content?

> `readonly` `optional` **content?**: `string`

Defined in: web/dist/stream/llm-chunks.d.ts:27

Text content (for `text` and tool-call deltas).

***

### partial

> `readonly` **partial**: `boolean`

Defined in: web/dist/stream/llm-chunks.d.ts:25

Whether this chunk is incremental (more is coming).

***

### toolArgs?

> `readonly` `optional` **toolArgs?**: `unknown`

Defined in: web/dist/stream/llm-chunks.d.ts:31

Parsed tool arguments (populated on `tool-call-end`).

***

### toolName?

> `readonly` `optional` **toolName?**: `string`

Defined in: web/dist/stream/llm-chunks.d.ts:29

Tool name for tool-call chunks.

***

### type

> `readonly` **type**: [`LLMChunkType`](../type-aliases/LLMChunkType.md)

Defined in: web/dist/stream/llm-chunks.d.ts:23

Kind of chunk.

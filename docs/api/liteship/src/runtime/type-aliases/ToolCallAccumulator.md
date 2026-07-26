[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / ToolCallAccumulator

# Type Alias: ToolCallAccumulator

> **ToolCallAccumulator** = \{ `argFragments`: `string`[]; `name`: `string`; \} \| `null`

Defined in: web/dist/stream/llm-chunks.d.ts:38

Per-stream scratch state used to accumulate tool-call argument
fragments into a single JSON payload at `tool-call-end` time.
`null` means "no tool call in flight."

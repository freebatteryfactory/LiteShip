[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / TokenBuffer

# Type Alias: TokenBuffer\<T\>

> **TokenBuffer**\<`T`\> = `TokenBufferShape`\<`T`\>

Defined in: core/dist/media/token-buffer.d.ts:77

Public structural type for `TokenBuffer` — a ring buffer that absorbs bursty LLM
token arrival and hands tokens out at a smooth cadence. The `push` + `drainInto`
path is genuinely zero-allocation (measured, pinned); `drain` is the allocating
convenience. Reports stall via `isStalled` and rate via an internal EMA.
Construct one with the standalone [createTokenBuffer](../functions/createTokenBuffer.md).

## Type Parameters

### T

`T` = `string`

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TokenBuffer

# Type Alias: TokenBuffer\<T\>

> **TokenBuffer**\<`T`\> = `TokenBufferShape`\<`T`\>

Defined in: [core/src/media/token-buffer.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/token-buffer.ts#L207)

Public structural type for `TokenBuffer` — a ring buffer that absorbs bursty LLM
token arrival and hands tokens out at a smooth cadence. The `push` + `drainInto`
path is genuinely zero-allocation (measured, pinned); `drain` is the allocating
convenience. Reports stall via `isStalled` and rate via an internal EMA.
Construct one with the standalone [createTokenBuffer](../functions/createTokenBuffer.md).

## Type Parameters

### T

`T` = `string`

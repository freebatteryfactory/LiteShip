[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / createTokenBuffer

# Function: createTokenBuffer()

> **createTokenBuffer**\<`T`\>(`config?`): [`TokenBuffer`](../type-aliases/TokenBuffer.md)\<`T`\>

Defined in: [core/src/media/token-buffer.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/token-buffer.ts#L73)

Create a [TokenBuffer](../type-aliases/TokenBuffer.md) — a ring buffer that absorbs bursty LLM token
arrival and hands tokens out at a smooth cadence. Pass a capacity or reuse the
defaults (verb grammar — `create` allocates a runtime resource).

## Type Parameters

### T

`T` = `string`

## Parameters

### config?

`TokenBufferConfig`

## Returns

[`TokenBuffer`](../type-aliases/TokenBuffer.md)\<`T`\>

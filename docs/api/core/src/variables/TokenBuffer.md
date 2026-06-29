[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TokenBuffer

# Variable: TokenBuffer

> `const` **TokenBuffer**: `object`

Defined in: [core/src/token-buffer.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/token-buffer.ts#L201)

TokenBuffer — ring buffer that absorbs bursty LLM token arrival and hands
tokens out at a smooth cadence. The `push` + `drainInto` path is genuinely
zero-allocation (measured, pinned); `drain` is the allocating convenience.
Reports stall via `isStalled` and rate via an internal EMA.

## Type Declaration

### make

> **make**: \<`T`\>(`config?`) => `TokenBufferShape`\<`T`\> = `_make`

Build a new buffer — pass capacity or reuse defaults.

#### Type Parameters

##### T

`T` = `string`

#### Parameters

##### config?

`TokenBufferConfig`

#### Returns

`TokenBufferShape`\<`T`\>

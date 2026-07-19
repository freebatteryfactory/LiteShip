[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / decode

# Function: decode()

> **decode**\<`A`, `I`\>(`schema`, `input`): [`DecodeResult`](../type-aliases/DecodeResult.md)\<`A`\>

Defined in: [core/src/schema/decode.ts:283](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L283)

STRICT decode — fail-closed. Returns the decoded `A`, or an accumulated,
path-tagged [DecodeIssue](../interfaces/DecodeIssue.md) list. Never throws on bad input; never mutates
a prototype.

## Type Parameters

### A

`A`

### I

`I`

## Parameters

### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `I`\>

### input

`unknown`

## Returns

[`DecodeResult`](../type-aliases/DecodeResult.md)\<`A`\>

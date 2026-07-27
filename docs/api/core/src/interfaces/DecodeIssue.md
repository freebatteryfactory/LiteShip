[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DecodeIssue

# Interface: DecodeIssue

Defined in: [core/src/schema/decode.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L35)

One strict-decode failure, tagged by the [DecodePath](../type-aliases/DecodePath.md) it occurred at.

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: [core/src/schema/decode.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L40)

The folded upstream cause (e.g. a brand's `ValidationError`), when present.

***

### code

> `readonly` **code**: [`DecodeIssueCode`](../type-aliases/DecodeIssueCode.md)

Defined in: [core/src/schema/decode.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L37)

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/schema/decode.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L38)

***

### path

> `readonly` **path**: [`DecodePath`](../type-aliases/DecodePath.md)

Defined in: [core/src/schema/decode.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L36)

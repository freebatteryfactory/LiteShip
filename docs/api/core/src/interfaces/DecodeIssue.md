[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DecodeIssue

# Interface: DecodeIssue

Defined in: [core/src/schema/decode.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L42)

One strict-decode failure, tagged by the [DecodePath](../type-aliases/DecodePath.md) it occurred at.

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: [core/src/schema/decode.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L47)

The folded upstream cause (e.g. a brand's `ValidationError`), when present.

***

### code

> `readonly` **code**: [`DecodeIssueCode`](../type-aliases/DecodeIssueCode.md)

Defined in: [core/src/schema/decode.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L44)

***

### message

> `readonly` **message**: `string`

Defined in: [core/src/schema/decode.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L45)

***

### path

> `readonly` **path**: [`DecodePath`](../type-aliases/DecodePath.md)

Defined in: [core/src/schema/decode.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L43)

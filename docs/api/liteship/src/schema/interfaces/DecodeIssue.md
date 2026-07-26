[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / DecodeIssue

# Interface: DecodeIssue

Defined in: core/dist/schema/decode.d.ts:31

One strict-decode failure, tagged by the [DecodePath](../type-aliases/DecodePath.md) it occurred at.

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: core/dist/schema/decode.d.ts:36

The folded upstream cause (e.g. a brand's `ValidationError`), when present.

***

### code

> `readonly` **code**: [`DecodeIssueCode`](../type-aliases/DecodeIssueCode.md)

Defined in: core/dist/schema/decode.d.ts:33

***

### message

> `readonly` **message**: `string`

Defined in: core/dist/schema/decode.d.ts:34

***

### path

> `readonly` **path**: [`DecodePath`](../type-aliases/DecodePath.md)

Defined in: core/dist/schema/decode.d.ts:32

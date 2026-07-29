[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / SchemaPort

# Interface: SchemaPort\<A, I\>

Defined in: core/dist/schema/schema-port.d.ts:19

The phantom `Type`/`Encoded` pair a schema value carries: `A` is the decoded
type, `I` the encoded (wire) type. Structurally satisfied by every effect
`Schema`/`Codec` value and by every kernel `Schema`. Both parameters are
covariant (readonly-only positions).

## Extended by

- [`DeclarationSchema`](DeclarationSchema.md)

## Type Parameters

### A

`A`

### I

`I` = `A`

## Properties

### Encoded

> `readonly` **Encoded**: `I`

Defined in: core/dist/schema/schema-port.d.ts:21

***

### Type

> `readonly` **Type**: `A`

Defined in: core/dist/schema/schema-port.d.ts:20

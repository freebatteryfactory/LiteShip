[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / SchemaPort

# Interface: SchemaPort\<A, I\>

Defined in: [core/src/schema/schema-port.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L20)

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

Defined in: [core/src/schema/schema-port.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L22)

***

### Type

> `readonly` **Type**: `A`

Defined in: [core/src/schema/schema-port.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L21)

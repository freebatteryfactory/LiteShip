[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DeclarationSchema

# Interface: DeclarationSchema\<T\>

Defined in: [core/src/schema/schema-port.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L34)

A [SchemaPort](SchemaPort.md) tagged as a DECLARATION: a schema whose value domain is
asserted, not structurally walkable (raw bytes, opaque carriers), so the
harness reports it "not arbitrary-derivable" rather than fabricating samples.
The `unique symbol` brand is nominal — nothing acquires it structurally, so a
plain schema is never mistaken for a declaration.

## Extends

- [`SchemaPort`](SchemaPort.md)\<`T`\>

## Type Parameters

### T

`T`

## Properties

### \[DeclarationTypeId\]

> `readonly` **\[DeclarationTypeId\]**: `T`

Defined in: [core/src/schema/schema-port.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L35)

***

### Encoded

> `readonly` **Encoded**: `T`

Defined in: [core/src/schema/schema-port.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L22)

#### Inherited from

[`SchemaPort`](SchemaPort.md).[`Encoded`](SchemaPort.md#encoded)

***

### Type

> `readonly` **Type**: `T`

Defined in: [core/src/schema/schema-port.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/schema-port.ts#L21)

#### Inherited from

[`SchemaPort`](SchemaPort.md).[`Type`](SchemaPort.md#type)

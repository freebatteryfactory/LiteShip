[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / DeclarationSchema

# Interface: DeclarationSchema\<T\>

Defined in: core/dist/schema/schema-port.d.ts:31

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

Defined in: core/dist/schema/schema-port.d.ts:32

***

### Encoded

> `readonly` **Encoded**: `T`

Defined in: core/dist/schema/schema-port.d.ts:21

#### Inherited from

[`SchemaPort`](SchemaPort.md).[`Encoded`](SchemaPort.md#encoded)

***

### Type

> `readonly` **Type**: `T`

Defined in: core/dist/schema/schema-port.d.ts:20

#### Inherited from

[`SchemaPort`](SchemaPort.md).[`Type`](SchemaPort.md#type)

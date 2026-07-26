[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / StructNode

# Interface: StructNode

Defined in: core/dist/schema/ast.d.ts:82

An object with a fixed, ordered set of keyed fields (each required or optional).

## Extends

- `NodeMeta`

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: core/dist/schema/ast.d.ts:51

#### Inherited from

`NodeMeta.annotations`

***

### fields

> `readonly` **fields**: readonly [`StructField`](StructField.md)[]

Defined in: core/dist/schema/ast.d.ts:84

***

### kind

> `readonly` **kind**: `"struct"`

Defined in: core/dist/schema/ast.d.ts:83

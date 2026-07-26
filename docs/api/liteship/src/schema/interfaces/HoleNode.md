[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / HoleNode

# Interface: HoleNode

Defined in: core/dist/schema/ast.d.ts:145

A typed HOLE — a loud, enumerable, decode-blocking placeholder. It types as
its declared `A` so authoring proceeds, but decode ALWAYS emits a blocking
`schema/hole` issue and never passes data through.

## Extends

- `NodeMeta`

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: core/dist/schema/ast.d.ts:51

#### Inherited from

`NodeMeta.annotations`

***

### kind

> `readonly` **kind**: `"hole"`

Defined in: core/dist/schema/ast.d.ts:146

***

### name

> `readonly` **name**: `string`

Defined in: core/dist/schema/ast.d.ts:147

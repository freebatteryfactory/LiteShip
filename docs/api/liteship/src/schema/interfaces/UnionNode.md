[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / UnionNode

# Interface: UnionNode

Defined in: core/dist/schema/ast.d.ts:71

A closed set of alternatives; decode accepts the first member that matches.

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

> `readonly` **kind**: `"union"`

Defined in: core/dist/schema/ast.d.ts:72

***

### members

> `readonly` **members**: readonly [`SchemaNode`](../type-aliases/SchemaNode.md)[]

Defined in: core/dist/schema/ast.d.ts:73

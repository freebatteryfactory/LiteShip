[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / UnionSchemaNode

# Interface: UnionSchemaNode

Defined in: [\_spine/core.d.ts:632](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L632)

Union schema AST node.

## Extends

- [`SchemaNodeMeta`](SchemaNodeMeta.md)

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: [\_spine/core.d.ts:612](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L612)

#### Inherited from

[`SchemaNodeMeta`](SchemaNodeMeta.md).[`annotations`](SchemaNodeMeta.md#annotations)

***

### kind

> `readonly` **kind**: `"union"`

Defined in: [\_spine/core.d.ts:633](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L633)

***

### members

> `readonly` **members**: readonly [`SchemaNode`](../type-aliases/SchemaNode.md)[]

Defined in: [\_spine/core.d.ts:634](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L634)

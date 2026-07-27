[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / UnionSchemaNode

# Interface: UnionSchemaNode

Defined in: [\_spine/core.d.ts:631](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L631)

Union schema AST node.

## Extends

- [`SchemaNodeMeta`](SchemaNodeMeta.md)

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: [\_spine/core.d.ts:611](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L611)

#### Inherited from

[`SchemaNodeMeta`](SchemaNodeMeta.md).[`annotations`](SchemaNodeMeta.md#annotations)

***

### kind

> `readonly` **kind**: `"union"`

Defined in: [\_spine/core.d.ts:632](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L632)

***

### members

> `readonly` **members**: readonly [`SchemaNode`](../type-aliases/SchemaNode.md)[]

Defined in: [\_spine/core.d.ts:633](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L633)

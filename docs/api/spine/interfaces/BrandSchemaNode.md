[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / BrandSchemaNode

# Interface: BrandSchemaNode

Defined in: [\_spine/core.d.ts:677](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L677)

Branded schema AST node.

## Extends

- [`SchemaNodeMeta`](SchemaNodeMeta.md)

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: [\_spine/core.d.ts:612](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L612)

#### Inherited from

[`SchemaNodeMeta`](SchemaNodeMeta.md).[`annotations`](SchemaNodeMeta.md#annotations)

***

### base

> `readonly` **base**: [`SchemaNode`](../type-aliases/SchemaNode.md)

Defined in: [\_spine/core.d.ts:679](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L679)

***

### kind

> `readonly` **kind**: `"brand"`

Defined in: [\_spine/core.d.ts:678](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L678)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:680](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L680)

***

### refine

> `readonly` **refine**: (`value`) => `unknown`

Defined in: [\_spine/core.d.ts:681](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L681)

#### Parameters

##### value

`unknown`

#### Returns

`unknown`

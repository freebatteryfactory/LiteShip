[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BrandSchemaNode

# Interface: BrandSchemaNode

Defined in: [\_spine/core.d.ts:676](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L676)

Branded schema AST node.

## Extends

- [`SchemaNodeMeta`](SchemaNodeMeta.md)

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: [\_spine/core.d.ts:611](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L611)

#### Inherited from

[`SchemaNodeMeta`](SchemaNodeMeta.md).[`annotations`](SchemaNodeMeta.md#annotations)

***

### base

> `readonly` **base**: [`SchemaNode`](../type-aliases/SchemaNode.md)

Defined in: [\_spine/core.d.ts:678](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L678)

***

### kind

> `readonly` **kind**: `"brand"`

Defined in: [\_spine/core.d.ts:677](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L677)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:679](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L679)

***

### refine

> `readonly` **refine**: (`value`) => `unknown`

Defined in: [\_spine/core.d.ts:680](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L680)

#### Parameters

##### value

`unknown`

#### Returns

`unknown`

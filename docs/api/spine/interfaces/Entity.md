[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Entity

# Interface: Entity\<P\>

Defined in: [\_spine/core.d.ts:748](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L748)

Immutable snapshot view of one entity.

## Type Parameters

### P

`P` *extends* [`AnyPart`](../type-aliases/AnyPart.md) = [`AnyPart`](../type-aliases/AnyPart.md)

## Properties

### id

> `readonly` **id**: [`EntityId`](../type-aliases/EntityId.md)

Defined in: [\_spine/core.d.ts:749](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L749)

## Methods

### get()

> **get**\<`Q`\>(`part`): [`PartValue`](../type-aliases/PartValue.md)\<`Q`\>

Defined in: [\_spine/core.d.ts:750](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L750)

#### Type Parameters

##### Q

`Q` *extends* [`AnyPart`](../type-aliases/AnyPart.md)

#### Parameters

##### part

`Q`

#### Returns

[`PartValue`](../type-aliases/PartValue.md)\<`Q`\>

[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / DenseStoreWriter

# Interface: DenseStoreWriter\<P\>

Defined in: [\_spine/core.d.ts:831](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L831)

Trusted writer paired with one dense numeric store.

## Type Parameters

### P

`P` *extends* [`Part`](Part.md)\<`number`\> = [`Part`](Part.md)\<`number`\>

## Properties

### part

> `readonly` **part**: `P`

Defined in: [\_spine/core.d.ts:832](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L832)

## Methods

### delete()

> **delete**(`entityId`): `boolean`

Defined in: [\_spine/core.d.ts:834](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L834)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

#### Returns

`boolean`

***

### reset()

> **reset**(): `void`

Defined in: [\_spine/core.d.ts:835](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L835)

#### Returns

`void`

***

### set()

> **set**(`entityId`, `value`): `void`

Defined in: [\_spine/core.d.ts:833](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L833)

#### Parameters

##### entityId

[`EntityId`](../type-aliases/EntityId.md)

##### value

`number`

#### Returns

`void`

***

### view()

> **view**(): `Float64Array`

Defined in: [\_spine/core.d.ts:836](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L836)

#### Returns

`Float64Array`

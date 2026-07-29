[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / DirtyFlags

# Interface: DirtyFlags\<K\>

Defined in: [\_spine/core.d.ts:550](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L550)

Constant-time dirty-bit tracker over a closed key set.

## Type Parameters

### K

`K` *extends* `string` = `string`

## Properties

### mask

> `readonly` **mask**: `number`

Defined in: [\_spine/core.d.ts:556](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L556)

## Methods

### clear()

> **clear**(`key`): `void`

Defined in: [\_spine/core.d.ts:552](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L552)

#### Parameters

##### key

`K`

#### Returns

`void`

***

### clearAll()

> **clearAll**(): `void`

Defined in: [\_spine/core.d.ts:553](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L553)

#### Returns

`void`

***

### getDirty()

> **getDirty**(): readonly `K`[]

Defined in: [\_spine/core.d.ts:555](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L555)

#### Returns

readonly `K`[]

***

### isDirty()

> **isDirty**(`key`): `boolean`

Defined in: [\_spine/core.d.ts:554](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L554)

#### Parameters

##### key

`K`

#### Returns

`boolean`

***

### mark()

> **mark**(`key`): `void`

Defined in: [\_spine/core.d.ts:551](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L551)

#### Parameters

##### key

`K`

#### Returns

`void`

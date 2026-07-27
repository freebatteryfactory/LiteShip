[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / DirtyFlags

# Interface: DirtyFlags\<K\>

Defined in: [\_spine/core.d.ts:522](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L522)

Constant-time dirty-bit tracker over a closed key set.

## Type Parameters

### K

`K` *extends* `string` = `string`

## Properties

### mask

> `readonly` **mask**: `number`

Defined in: [\_spine/core.d.ts:528](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L528)

## Methods

### clear()

> **clear**(`key`): `void`

Defined in: [\_spine/core.d.ts:524](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L524)

#### Parameters

##### key

`K`

#### Returns

`void`

***

### clearAll()

> **clearAll**(): `void`

Defined in: [\_spine/core.d.ts:525](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L525)

#### Returns

`void`

***

### getDirty()

> **getDirty**(): readonly `K`[]

Defined in: [\_spine/core.d.ts:527](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L527)

#### Returns

readonly `K`[]

***

### isDirty()

> **isDirty**(`key`): `boolean`

Defined in: [\_spine/core.d.ts:526](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L526)

#### Parameters

##### key

`K`

#### Returns

`boolean`

***

### mark()

> **mark**(`key`): `void`

Defined in: [\_spine/core.d.ts:523](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L523)

#### Parameters

##### key

`K`

#### Returns

`void`

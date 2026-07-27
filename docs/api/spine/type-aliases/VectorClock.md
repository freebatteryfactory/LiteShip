[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / VectorClock

# Type Alias: VectorClock

> **VectorClock** = `object`

Defined in: [\_spine/core.d.ts:952](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L952)

## Methods

### compare()

> **compare**(`a`, `b`): `-1` \| `0` \| `1`

Defined in: [\_spine/core.d.ts:966](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L966)

#### Parameters

##### a

`VectorClock`

##### b

`VectorClock`

#### Returns

`-1` \| `0` \| `1`

***

### concurrent()

> **concurrent**(`a`, `b`): `boolean`

Defined in: [\_spine/core.d.ts:964](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L964)

#### Parameters

##### a

`VectorClock`

##### b

`VectorClock`

#### Returns

`boolean`

***

### equals()

> **equals**(`a`, `b`): `boolean`

Defined in: [\_spine/core.d.ts:965](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L965)

#### Parameters

##### a

`VectorClock`

##### b

`VectorClock`

#### Returns

`boolean`

***

### from()

> **from**(`entries`): `VectorClock`

Defined in: [\_spine/core.d.ts:959](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L959)

#### Parameters

##### entries

`Record`\<`string`, `number`\>

#### Returns

`VectorClock`

***

### get()

> **get**(`vc`, `peerId`): `number`

Defined in: [\_spine/core.d.ts:960](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L960)

#### Parameters

##### vc

`VectorClock`

##### peerId

`string`

#### Returns

`number`

***

### happensBefore()

> **happensBefore**(`a`, `b`): `boolean`

Defined in: [\_spine/core.d.ts:963](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L963)

#### Parameters

##### a

`VectorClock`

##### b

`VectorClock`

#### Returns

`boolean`

***

### make()

> **make**(): `VectorClock`

Defined in: [\_spine/core.d.ts:958](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L958)

#### Returns

`VectorClock`

***

### merge()

> **merge**(`a`, `b`): `VectorClock`

Defined in: [\_spine/core.d.ts:962](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L962)

#### Parameters

##### a

`VectorClock`

##### b

`VectorClock`

#### Returns

`VectorClock`

***

### peers()

> **peers**(`vc`): `string`[]

Defined in: [\_spine/core.d.ts:968](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L968)

#### Parameters

##### vc

`VectorClock`

#### Returns

`string`[]

***

### size()

> **size**(`vc`): `number`

Defined in: [\_spine/core.d.ts:969](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L969)

#### Parameters

##### vc

`VectorClock`

#### Returns

`number`

***

### tick()

> **tick**(`vc`, `peerId`): `VectorClock`

Defined in: [\_spine/core.d.ts:961](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L961)

#### Parameters

##### vc

`VectorClock`

##### peerId

`string`

#### Returns

`VectorClock`

***

### toObject()

> **toObject**(`vc`): `Record`\<`string`, `number`\>

Defined in: [\_spine/core.d.ts:967](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L967)

#### Parameters

##### vc

`VectorClock`

#### Returns

`Record`\<`string`, `number`\>

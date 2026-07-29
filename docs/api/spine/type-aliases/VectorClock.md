[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / VectorClock

# Type Alias: VectorClock

> **VectorClock** = `object`

Defined in: [\_spine/core.d.ts:1168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1168)

## Methods

### compare()

> **compare**(`a`, `b`): `-1` \| `0` \| `1`

Defined in: [\_spine/core.d.ts:1182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1182)

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

Defined in: [\_spine/core.d.ts:1180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1180)

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

Defined in: [\_spine/core.d.ts:1181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1181)

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

Defined in: [\_spine/core.d.ts:1175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1175)

#### Parameters

##### entries

`Record`\<`string`, `number`\>

#### Returns

`VectorClock`

***

### get()

> **get**(`vc`, `peerId`): `number`

Defined in: [\_spine/core.d.ts:1176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1176)

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

Defined in: [\_spine/core.d.ts:1179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1179)

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

Defined in: [\_spine/core.d.ts:1174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1174)

#### Returns

`VectorClock`

***

### merge()

> **merge**(`a`, `b`): `VectorClock`

Defined in: [\_spine/core.d.ts:1178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1178)

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

Defined in: [\_spine/core.d.ts:1184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1184)

#### Parameters

##### vc

`VectorClock`

#### Returns

`string`[]

***

### size()

> **size**(`vc`): `number`

Defined in: [\_spine/core.d.ts:1185](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1185)

#### Parameters

##### vc

`VectorClock`

#### Returns

`number`

***

### tick()

> **tick**(`vc`, `peerId`): `VectorClock`

Defined in: [\_spine/core.d.ts:1177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1177)

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

Defined in: [\_spine/core.d.ts:1183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1183)

#### Parameters

##### vc

`VectorClock`

#### Returns

`Record`\<`string`, `number`\>

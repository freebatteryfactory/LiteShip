[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / HLC

# Type Alias: HLC

> **HLC** = `object`

Defined in: [\_spine/core.d.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L105)

## Methods

### compare()

> **compare**(`a`, `b`): `-1` \| `0` \| `1`

Defined in: [\_spine/core.d.ts:939](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L939)

#### Parameters

##### a

`HLC`

##### b

`HLC`

#### Returns

`-1` \| `0` \| `1`

***

### create()

> **create**(`nodeId`): `HLC`

Defined in: [\_spine/core.d.ts:938](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L938)

#### Parameters

##### nodeId

`string`

#### Returns

`HLC`

***

### decode()

> **decode**(`s`): `HLC`

Defined in: [\_spine/core.d.ts:943](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L943)

#### Parameters

##### s

`string`

#### Returns

`HLC`

***

### encode()

> **encode**(`hlc`): `string`

Defined in: [\_spine/core.d.ts:942](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L942)

#### Parameters

##### hlc

`HLC`

#### Returns

`string`

***

### increment()

> **increment**(`hlc`, `now?`): `HLC`

Defined in: [\_spine/core.d.ts:940](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L940)

#### Parameters

##### hlc

`HLC`

##### now?

`number`

#### Returns

`HLC`

***

### makeClock()

> **makeClock**(`nodeId`, `clock?`): [`HLCClock`](../interfaces/HLCClock.md)

Defined in: [\_spine/core.d.ts:944](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L944)

#### Parameters

##### nodeId

`string`

##### clock?

[`Clock`](../interfaces/Clock.md)

#### Returns

[`HLCClock`](../interfaces/HLCClock.md)

***

### merge()

> **merge**(`local`, `remote`, `now?`): `HLC`

Defined in: [\_spine/core.d.ts:941](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L941)

#### Parameters

##### local

`HLC`

##### remote

`HLC`

##### now?

`number`

#### Returns

`HLC`

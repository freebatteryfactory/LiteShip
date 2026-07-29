[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / HLC

# Type Alias: HLC

> **HLC** = `object`

Defined in: [\_spine/core.d.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L112)

## Methods

### compare()

> **compare**(`a`, `b`): `-1` \| `0` \| `1`

Defined in: [\_spine/core.d.ts:1155](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1155)

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

Defined in: [\_spine/core.d.ts:1154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1154)

#### Parameters

##### nodeId

`string`

#### Returns

`HLC`

***

### decode()

> **decode**(`s`): `HLC`

Defined in: [\_spine/core.d.ts:1159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1159)

#### Parameters

##### s

`string`

#### Returns

`HLC`

***

### encode()

> **encode**(`hlc`): `string`

Defined in: [\_spine/core.d.ts:1158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1158)

#### Parameters

##### hlc

`HLC`

#### Returns

`string`

***

### increment()

> **increment**(`hlc`, `now?`): `HLC`

Defined in: [\_spine/core.d.ts:1156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1156)

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

Defined in: [\_spine/core.d.ts:1160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1160)

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

Defined in: [\_spine/core.d.ts:1157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1157)

#### Parameters

##### local

`HLC`

##### remote

`HLC`

##### now?

`number`

#### Returns

`HLC`

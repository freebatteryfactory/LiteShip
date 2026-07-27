[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / BoundarySpec

# Interface: BoundarySpec

Defined in: [\_spine/core.d.ts:239](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L239)

Optional per-boundary activation filter: gate a boundary on device
capabilities, an epoch-ms time window, or experiment participation. When a
spec is present and `BoundarySpec.isActive` returns false for the current
context, the boundary is skipped during evaluation.

## Properties

### deviceFilter?

> `readonly` `optional` **deviceFilter?**: (`capabilities`) => `boolean`

Defined in: [\_spine/core.d.ts:241](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L241)

Only evaluate this boundary when the device filter returns true.

#### Parameters

##### capabilities

`Record`\<`string`, `unknown`\>

#### Returns

`boolean`

***

### experimentId?

> `readonly` `optional` **experimentId?**: `string`

Defined in: [\_spine/core.d.ts:245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L245)

Only evaluate this boundary for participants in this experiment.

***

### timeRange?

> `readonly` `optional` **timeRange?**: `object`

Defined in: [\_spine/core.d.ts:243](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L243)

Only evaluate this boundary within this time range (epoch ms).

#### from?

> `readonly` `optional` **from?**: `number`

#### until?

> `readonly` `optional` **until?**: `number`

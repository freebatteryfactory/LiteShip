[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / EdgeHostAdapter

# Interface: EdgeHostAdapter

Defined in: [\_spine/edge.d.ts:316](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L316)

Host-neutral edge adapter that resolves request evidence into LiteShip outputs.

## Methods

### resolve()

> **resolve**(`headers`): `Promise`\<[`EdgeHostResolution`](EdgeHostResolution.md)\>

Defined in: [\_spine/edge.d.ts:317](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L317)

#### Parameters

##### headers

`Headers` \| [`ClientHintsHeaders`](ClientHintsHeaders.md)

#### Returns

`Promise`\<[`EdgeHostResolution`](EdgeHostResolution.md)\>

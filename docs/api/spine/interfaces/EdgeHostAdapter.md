[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / EdgeHostAdapter

# Interface: EdgeHostAdapter

Defined in: [\_spine/edge.d.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L290)

Host-neutral edge adapter that resolves request evidence into LiteShip outputs.

## Methods

### resolve()

> **resolve**(`headers`): `Promise`\<[`EdgeHostResolution`](EdgeHostResolution.md)\>

Defined in: [\_spine/edge.d.ts:291](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/edge.d.ts#L291)

#### Parameters

##### headers

`Headers` \| [`ClientHintsHeaders`](ClientHintsHeaders.md)

#### Returns

`Promise`\<[`EdgeHostResolution`](EdgeHostResolution.md)\>

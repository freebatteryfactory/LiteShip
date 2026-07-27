[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeHostBackground

# Interface: EdgeHostBackground

Defined in: [edge/src/host-adapter.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L156)

Optional Workers background hook for deferring KV write-back off the request path (#122).

## Properties

### waitUntil

> `readonly` **waitUntil**: (`promise`) => `void`

Defined in: [edge/src/host-adapter.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/host-adapter.ts#L157)

#### Parameters

##### promise

`Promise`\<`unknown`\>

#### Returns

`void`

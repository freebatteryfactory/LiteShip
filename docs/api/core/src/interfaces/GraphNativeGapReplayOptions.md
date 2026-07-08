[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphNativeGapReplayOptions

# Interface: GraphNativeGapReplayOptions

Defined in: [core/src/graph-query-gap-replay.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L35)

Options for QUERY-backed graph-native gap replay (#133-full).

## Properties

### adopt

> `readonly` **adopt**: (`graph`) => `void`

Defined in: [core/src/graph-query-gap-replay.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L40)

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### applyDiscrete?

> `readonly` `optional` **applyDiscrete?**: (`payload`) => `void`

Defined in: [core/src/graph-query-gap-replay.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L41)

#### Parameters

##### payload

`unknown`

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStoreShape`](StateCellStoreShape.md)

Defined in: [core/src/graph-query-gap-replay.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L39)

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: [core/src/graph-query-gap-replay.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L38)

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [core/src/graph-query-gap-replay.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L42)

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

***

### localBase

> `readonly` **localBase**: [`DocumentGraph`](DocumentGraph.md)

Defined in: [core/src/graph-query-gap-replay.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L37)

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: [core/src/graph-query-gap-replay.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L43)

***

### queryUrl

> `readonly` **queryUrl**: `string`

Defined in: [core/src/graph-query-gap-replay.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L36)

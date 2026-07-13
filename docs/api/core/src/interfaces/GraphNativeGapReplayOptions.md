[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphNativeGapReplayOptions

# Interface: GraphNativeGapReplayOptions

Defined in: [core/src/graph-query-gap-replay.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L43)

Options for QUERY-backed graph-native gap replay (#133-full).

## Properties

### adopt

> `readonly` **adopt**: (`graph`) => `void`

Defined in: [core/src/graph-query-gap-replay.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L48)

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: [core/src/graph-query-gap-replay.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L50)

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStoreShape`](StateCellStoreShape.md)

Defined in: [core/src/graph-query-gap-replay.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L47)

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: [core/src/graph-query-gap-replay.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L46)

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [core/src/graph-query-gap-replay.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L51)

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

Defined in: [core/src/graph-query-gap-replay.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L45)

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: [core/src/graph-query-gap-replay.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L52)

***

### queryUrl

> `readonly` **queryUrl**: `string`

Defined in: [core/src/graph-query-gap-replay.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-query-gap-replay.ts#L44)

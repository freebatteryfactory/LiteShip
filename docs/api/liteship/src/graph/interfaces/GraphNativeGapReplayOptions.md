[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphNativeGapReplayOptions

# Interface: GraphNativeGapReplayOptions

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:37

Options for QUERY-backed graph-native gap replay (#133-full).

## Properties

### adopt

> `readonly` **adopt**: (`graph`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:42

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:44

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](../../reactive/interfaces/StateCellStore.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:41

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:40

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:45

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`RequestInfo` \| `URL`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `Request` \| `URL`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

***

### localBase

> `readonly` **localBase**: [`DocumentGraph`](DocumentGraph.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:39

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:46

***

### queryUrl

> `readonly` **queryUrl**: `string`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:38

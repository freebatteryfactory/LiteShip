[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphNativeGapReplayOptions

# Interface: GraphNativeGapReplayOptions

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:49

Options for QUERY-backed graph-native gap replay (#133-full).

## Properties

### adopt

> `readonly` **adopt**: (`graph`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:54

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:56

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](../../reactive/interfaces/StateCellStore.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:53

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: [`ChainValidationOptions`](../../evidence/interfaces/ChainValidationOptions.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:58

Checkpoint-attestation retention for an evicted buffer prefix (issue #150).

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:52

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:59

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

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:51

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:60

***

### queryUrl

> `readonly` **queryUrl**: `string`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:50

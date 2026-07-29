[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / GraphNativeGapReplayOptions

# Interface: GraphNativeGapReplayOptions

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:54

Options for QUERY-backed graph-native gap replay (#133-full).

## Properties

### adopt

> `readonly` **adopt**: (`graph`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:59

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:61

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](../../reactive/interfaces/StateCellStore.md)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:58

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: [`ChainValidationOptions`](../../evidence/interfaces/ChainValidationOptions.md) \| (() => [`ChainValidationOptions`](../../evidence/interfaces/ChainValidationOptions.md) \| `undefined`)

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:67

Checkpoint-attestation retention for an evicted buffer prefix (issue #150).
A thunk defers resolution until the entries are read, keeping retention and
a live buffer consistent across the QUERY await (PR #188 review).

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:57

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:68

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

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:56

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:69

***

### queryUrl

> `readonly` **queryUrl**: `string`

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:55

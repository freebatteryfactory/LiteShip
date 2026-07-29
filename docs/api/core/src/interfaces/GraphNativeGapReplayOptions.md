[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / GraphNativeGapReplayOptions

# Interface: GraphNativeGapReplayOptions

Defined in: [core/src/graph/graph-query-gap-replay.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L63)

Options for QUERY-backed graph-native gap replay (#133-full).

## Properties

### adopt

> `readonly` **adopt**: (`graph`) => `void`

Defined in: [core/src/graph/graph-query-gap-replay.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L68)

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: [core/src/graph/graph-query-gap-replay.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L70)

Typed host reflection of an applied crossing (e.g. dispatch to the DOM).

#### Parameters

##### transition

[`DiscreteStateTransition`](DiscreteStateTransition.md)

#### Returns

`void`

***

### cellStore

> `readonly` **cellStore**: [`StateCellStore`](StateCellStore.md)

Defined in: [core/src/graph/graph-query-gap-replay.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L67)

***

### chainValidation?

> `readonly` `optional` **chainValidation?**: [`ChainValidationOptions`](ChainValidationOptions.md)

Defined in: [core/src/graph/graph-query-gap-replay.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L72)

Checkpoint-attestation retention for an evicted buffer prefix (issue #150).

***

### entries

> `readonly` **entries**: readonly [`PatchReceiptEntry`](PatchReceiptEntry.md)[]

Defined in: [core/src/graph/graph-query-gap-replay.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L66)

***

### fetchImpl?

> `readonly` `optional` **fetchImpl?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [core/src/graph/graph-query-gap-replay.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L73)

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

Defined in: [core/src/graph/graph-query-gap-replay.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L65)

***

### maxRetries?

> `readonly` `optional` **maxRetries?**: `number`

Defined in: [core/src/graph/graph-query-gap-replay.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L74)

***

### queryUrl

> `readonly` **queryUrl**: `string`

Defined in: [core/src/graph/graph-query-gap-replay.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L64)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphMutationClient

# Interface: GraphMutationClient

Defined in: [core/src/graph-mutation-client.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L73)

The client-side half of the mutation channel: a base-tracking state machine over
`sendGraphMutation`. Submits are strictly serialized (no self-inflicted CAS races),
an `applied` response advances the base, and a `staleBase` refusal reloads +
re-proposes within the configured bound.

## Properties

### adopt

> `readonly` **adopt**: (`next`) => `void`

Defined in: [core/src/graph-mutation-client.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L81)

Adopt an externally-obtained graph as the new base (e.g. from an SSE snapshot/patch stream).
If a submit is already in flight, that submit keeps the base it already captured; whichever
adopt/applied result writes last is the current base.

#### Parameters

##### next

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void`

***

### base

> `readonly` **base**: () => [`DocumentGraph`](DocumentGraph.md)

Defined in: [core/src/graph-mutation-client.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L75)

The current client-side base (advances on every applied submit / adopt).

#### Returns

[`DocumentGraph`](DocumentGraph.md)

***

### submit

> `readonly` **submit**: (`ops`) => `Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

Defined in: [core/src/graph-mutation-client.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation-client.ts#L87)

Propose ops against the current base, send, and settle to the channel's one-shape
response. NEVER rejects — every failure (ops builder throw, propose throw, transport,
refreshBase throw) maps to `{ status: 'error' }`, mirroring the channel contract.

#### Parameters

##### ops

[`GraphMutationOps`](../type-aliases/GraphMutationOps.md)

#### Returns

`Promise`\<[`GraphMutationResponse`](../type-aliases/GraphMutationResponse.md)\>

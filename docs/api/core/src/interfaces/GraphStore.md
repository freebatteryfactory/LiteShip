[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GraphStore

# Interface: GraphStore

Defined in: [core/src/graph-mutation.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L60)

The host's graph store — the authority boundary. LiteShip reads the current
truth and hands back the applied truth; the host decides where it lives (memory,
KV, DB) and persists it. `loadGraph` MUST return the current server-side graph
the client's patch will be validated against.

## Properties

### loadGraph

> `readonly` **loadGraph**: () => [`DocumentGraph`](DocumentGraph.md) \| `Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

Defined in: [core/src/graph-mutation.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L61)

#### Returns

[`DocumentGraph`](DocumentGraph.md) \| `Promise`\<[`DocumentGraph`](DocumentGraph.md)\>

***

### saveGraph

> `readonly` **saveGraph**: (`next`, `expected`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [core/src/graph-mutation.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L74)

Compare-and-swap the graph: commit `next` ONLY if the store's current graph is still
`expected` — the base the patch was validated against, compared by its content
address (`id`). Return `false` if the store moved since `loadGraph` (a concurrent
commit won); the channel then REFUSES so the client reloads and retries.

This is where the optimistic-concurrency guarantee is actually enforced. The
base-match validation stops a client that proposed against a STALE base; the CAS
stops two clients that both loaded the SAME base from clobbering each other (the
lost-update race). In-memory, compare the ids and swap only on a match; a DB/KV host
does a version-conditional UPDATE.

#### Parameters

##### next

[`DocumentGraph`](DocumentGraph.md)

##### expected

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`boolean` \| `Promise`\<`boolean`\>

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

> `readonly` **saveGraph**: (`graph`) => `void` \| `Promise`\<`void`\>

Defined in: [core/src/graph-mutation.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph-mutation.ts#L62)

#### Parameters

##### graph

[`DocumentGraph`](DocumentGraph.md)

#### Returns

`void` \| `Promise`\<`void`\>

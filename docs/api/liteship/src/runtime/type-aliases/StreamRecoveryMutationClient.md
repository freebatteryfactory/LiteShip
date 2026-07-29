[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / StreamRecoveryMutationClient

# Type Alias: StreamRecoveryMutationClient

> **StreamRecoveryMutationClient** = `Pick`\<[`GraphMutationClient`](../../graph/interfaces/GraphMutationClient.md), `"adopt"` \| `"base"`\> & `object`

Defined in: web/dist/stream/recovery.d.ts:13

Optional graph-mutation substrate for `refreshBase`/`adopt` during recovery.

## Type Declaration

### refreshBase?

> `readonly` `optional` **refreshBase?**: () => `Promise`\<[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)\>

#### Returns

`Promise`\<[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)\>

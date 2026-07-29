[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / StreamRecoveryMutationClient

# Type Alias: StreamRecoveryMutationClient

> **StreamRecoveryMutationClient** = `Pick`\<[`GraphMutationClient`](../../../liteship/src/graph/interfaces/GraphMutationClient.md), `"adopt"` \| `"base"`\> & `object`

Defined in: [web/src/stream/recovery.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L25)

Optional graph-mutation substrate for `refreshBase`/`adopt` during recovery.

## Type Declaration

### refreshBase?

> `readonly` `optional` **refreshBase?**: () => `Promise`\<[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)\>

#### Returns

`Promise`\<[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)\>

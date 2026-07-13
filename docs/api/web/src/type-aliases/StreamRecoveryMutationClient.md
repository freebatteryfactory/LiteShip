[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / StreamRecoveryMutationClient

# Type Alias: StreamRecoveryMutationClient

> **StreamRecoveryMutationClient** = `Pick`\<`GraphMutationClient`, `"adopt"` \| `"base"`\> & `object`

Defined in: [web/src/stream/recovery.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L27)

Optional graph-mutation substrate for `refreshBase`/`adopt` during recovery.

## Type Declaration

### refreshBase?

> `readonly` `optional` **refreshBase?**: () => `Promise`\<[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)\>

#### Returns

`Promise`\<[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)\>

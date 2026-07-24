[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / chainPatchesBetween

# Function: chainPatchesBetween()

> **chainPatchesBetween**(`localBaseId`, `serverGraphId`, `entries`): readonly [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)[]

Defined in: [core/src/graph/graph-query-gap-replay.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/graph-query-gap-replay.ts#L78)

Find the transition chain from `localBaseId` to `serverGraphId`.

The receipt buffer may hold FORKS (multiple transitions sharing one base) and
partial branches (chains that never reach the server graph). Selection is a
depth-first path search over each transition's graph identity
(`base` → `resultId`): only the branch that actually ends at `serverGraphId`
is returned. A fork that dead-ends is backtracked, never replayed — replaying
a branch the server did not take would be silently wrong. When NO buffered
branch reaches the server graph (missing tail receipt, unrelated fork) the
result is EMPTY: the QUERY adoption already corrected the graph, and no
discrete replay beats a wrong one.

## Parameters

### localBaseId

`ContentAddress`

### serverGraphId

`ContentAddress`

### entries

readonly [`PatchReceiptEntry`](../interfaces/PatchReceiptEntry.md)[]

## Returns

readonly [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)[]

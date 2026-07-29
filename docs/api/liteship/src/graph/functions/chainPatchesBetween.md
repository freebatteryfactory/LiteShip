[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / chainPatchesBetween

# Function: chainPatchesBetween()

> **chainPatchesBetween**(`localBaseId`, `serverGraphId`, `entries`): readonly [`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)[]

Defined in: core/dist/graph/graph-query-gap-replay.d.ts:81

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

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

### serverGraphId

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

### entries

readonly [`PatchReceiptEntry`](../interfaces/PatchReceiptEntry.md)[]

## Returns

readonly [`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)[]

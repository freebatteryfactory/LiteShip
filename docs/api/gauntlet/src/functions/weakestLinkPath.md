[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / weakestLinkPath

# Function: weakestLinkPath()

> **weakestLinkPath**(`ir`, `from`, `effective`, `localProofOf`): readonly `string`[]

Defined in: [gauntlet/src/proof-propagation.ts:170](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/proof-propagation.ts#L170)

The WEAKEST-LINK path from a module to the dependency that caps its effective
proof — a dependency chain `[module, …, weakLink]` where `weakLink`'s local proof
equals `module`'s effective proof (it is the dependency that dragged the module
down). Deterministic (lexicographically-smallest shortest path via a BFS over the
dep edges in sorted order), cycle-safe (visited set). Returns `[from]` when the
module's own local proof is already the minimum (no weaker dependency).

This names the link to STRENGTHEN in the weak-link finding — REPORT-not-DECIDE: the
gate points at the exact dependency, the human/agent strengthens it or reassesses
the criticality.

## Parameters

### ir

[`RepoIR`](../interfaces/RepoIR.md)

the dep DAG.

### from

`string`

the module whose weak-link path to trace.

### effective

`ReadonlyMap`\<`string`, `number`\>

the propagated effective-proof map (from [propagateProofStrength](propagateProofStrength.md)).

### localProofOf

(`file`) => `number`

the local proof scalar (to identify the capping dependency).

## Returns

readonly `string`[]

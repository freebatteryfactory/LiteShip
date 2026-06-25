[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / makeRepoIR

# Function: makeRepoIR()

> **makeRepoIR**(`parts`): [`RepoIR`](../interfaces/RepoIR.md)

Defined in: [gauntlet/src/repo-ir.ts:319](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L319)

Build a [RepoIR](../interfaces/RepoIR.md) from flat parts — the one pure constructor (the
`AssetRegistry.make` / `memoryContext` composition style). Frozen, immutable,
and invariant-checked: it indexes the flat arrays into the keyed tables and
validates every referential invariant up front, throwing a tagged
[InvariantViolationError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts) on the first violation (never a bare throw,
never a silent skip). This lets a FIXTURE assemble a literal in-memory IR with
NO `ts.Program` — the same value a host would inject, minus the real digests.

Invariants (all enforced):
- no duplicate [FileId](../type-aliases/FileId.md) in `files`;
- no duplicate [SymbolId](../type-aliases/SymbolId.md) in `symbols`;
- no duplicate [PkgName](../type-aliases/PkgName.md) in `packages`;
- every `SymbolNode.file` exists in `files`;
- every `ImportEdge.fromFile` exists in `files`;
- every `ImportEdge.targetFile` (when present) exists in `files`;
- every `RefSite.fromFile` (and every `refs` key as a SymbolId) is consistent;
- every `Fact.file` exists in `files`.

## Parameters

### parts

[`RepoIRParts`](../interfaces/RepoIRParts.md)

## Returns

[`RepoIR`](../interfaces/RepoIR.md)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FileId

# Type Alias: FileId

> **FileId** = `string`

Defined in: [gauntlet/src/repo-ir.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L37)

A repo-relative POSIX path, used as the stable identity of a file node.

A documented string alias (NOT a nominal brand): the IR is plain immutable
data a host builds and a gate folds over, and a brand would force every
literal fixture and every cross-package consumer through a cast. The contract
is the value MUST be repo-relative, POSIX-separated, and de-duplicated —
[makeRepoIR](../functions/makeRepoIR.md) enforces uniqueness; the host enforces normalization.

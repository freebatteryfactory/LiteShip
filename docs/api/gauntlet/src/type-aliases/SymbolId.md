[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SymbolId

# Type Alias: SymbolId

> **SymbolId** = `string`

Defined in: [gauntlet/src/repo-ir.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L45)

The stable identity of a symbol node. The convention a host follows is
`"<FileId>#<name>"` (file path, `#`, the exported/declared name), which keeps
it unique within a file and human-readable; the IR treats it as an opaque
de-duplicated key. [makeRepoIR](../functions/makeRepoIR.md) enforces uniqueness, not the format.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ImportEdge

# Interface: ImportEdge

Defined in: [gauntlet/src/repo-ir.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L182)

An edge in the import graph — one resolved `import`/`export-from` specifier.

## Properties

### fromFile

> `readonly` **fromFile**: `string`

Defined in: [gauntlet/src/repo-ir.ts:184](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L184)

The file the import appears in — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### kind

> `readonly` **kind**: [`ImportKind`](../type-aliases/ImportKind.md)

Defined in: [gauntlet/src/repo-ir.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L188)

How it resolved.

***

### specifier

> `readonly` **specifier**: `string`

Defined in: [gauntlet/src/repo-ir.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L186)

The raw specifier as written (`'./x.js'`, `'@czap/core'`, `'node:fs'`).

***

### targetFile?

> `readonly` `optional` **targetFile?**: `string`

Defined in: [gauntlet/src/repo-ir.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L194)

The resolved target file, when known (`relative` / `internal-package`). When
present it MUST exist in [RepoIR.files](RepoIR.md#files) — [makeRepoIR](../functions/makeRepoIR.md) enforces
this (a dangling edge is an invariant violation).

***

### targetPackage?

> `readonly` `optional` **targetPackage?**: `string`

Defined in: [gauntlet/src/repo-ir.ts:196](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L196)

The resolved target package, when known (`internal-package` / `external`).

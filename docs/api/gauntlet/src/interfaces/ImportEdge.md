[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ImportEdge

# Interface: ImportEdge

Defined in: [gauntlet/src/repo-ir.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L183)

An edge in the import graph — one resolved `import`/`export-from` specifier.

## Properties

### fromFile

> `readonly` **fromFile**: `string`

Defined in: [gauntlet/src/repo-ir.ts:185](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L185)

The file the import appears in — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### kind

> `readonly` **kind**: [`ImportKind`](../type-aliases/ImportKind.md)

Defined in: [gauntlet/src/repo-ir.ts:189](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L189)

How it resolved.

***

### specifier

> `readonly` **specifier**: `string`

Defined in: [gauntlet/src/repo-ir.ts:187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L187)

The raw specifier as written (`'./x.js'`, `'@liteship/core'`, `'node:fs'`).

***

### targetFile?

> `readonly` `optional` **targetFile?**: `string`

Defined in: [gauntlet/src/repo-ir.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L195)

The resolved target file, when known (`relative` / `internal-package`). When
present it MUST exist in [RepoIR.files](RepoIR.md#files) — [makeRepoIR](../functions/makeRepoIR.md) enforces
this (a dangling edge is an invariant violation).

***

### targetPackage?

> `readonly` `optional` **targetPackage?**: `string`

Defined in: [gauntlet/src/repo-ir.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L197)

The resolved target package, when known (`internal-package` / `external`).

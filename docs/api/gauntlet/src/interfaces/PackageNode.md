[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / PackageNode

# Interface: PackageNode

Defined in: [gauntlet/src/repo-ir.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L201)

A node in the package table.

## Properties

### manifestDeps

> `readonly` **manifestDeps**: readonly `string`[]

Defined in: [gauntlet/src/repo-ir.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L207)

The package's declared dependencies (manifest `dependencies` keys).

***

### name

> `readonly` **name**: `string`

Defined in: [gauntlet/src/repo-ir.ts:203](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L203)

Package name — the node's stable identity.

***

### srcDir

> `readonly` **srcDir**: `string`

Defined in: [gauntlet/src/repo-ir.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L205)

Repo-relative source directory (e.g. `packages/core/src`).

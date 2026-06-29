[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / PackageNode

# Interface: PackageNode

Defined in: [gauntlet/src/repo-ir.ts:200](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L200)

A node in the package table.

## Properties

### manifestDeps

> `readonly` **manifestDeps**: readonly `string`[]

Defined in: [gauntlet/src/repo-ir.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L206)

The package's declared dependencies (manifest `dependencies` keys).

***

### name

> `readonly` **name**: `string`

Defined in: [gauntlet/src/repo-ir.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L202)

Package name — the node's stable identity.

***

### srcDir

> `readonly` **srcDir**: `string`

Defined in: [gauntlet/src/repo-ir.ts:204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L204)

Repo-relative source directory (e.g. `packages/core/src`).

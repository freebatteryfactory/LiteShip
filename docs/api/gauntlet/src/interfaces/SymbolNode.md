[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SymbolNode

# Interface: SymbolNode

Defined in: [gauntlet/src/repo-ir.ts:140](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L140)

A node in the symbol table — an exported or referenced declaration.

## Properties

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/repo-ir.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L148)

The file this symbol is declared in — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/repo-ir.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L142)

Stable identity (host convention: `"<file>#<name>"`).

***

### kind

> `readonly` **kind**: [`SymbolKind`](../type-aliases/SymbolKind.md)

Defined in: [gauntlet/src/repo-ir.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L146)

What kind of declaration this is — the host's normalized syntactic kind.

***

### location

> `readonly` **location**: [`SourceLocation`](SourceLocation.md)

Defined in: [gauntlet/src/repo-ir.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L150)

Where the declaration points.

***

### name

> `readonly` **name**: `string`

Defined in: [gauntlet/src/repo-ir.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L144)

The declared/exported name.

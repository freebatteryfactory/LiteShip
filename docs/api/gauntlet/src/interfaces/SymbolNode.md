[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / SymbolNode

# Interface: SymbolNode

Defined in: [gauntlet/src/repo-ir.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L141)

A node in the symbol table — an exported or referenced declaration.

## Properties

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/repo-ir.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L149)

The file this symbol is declared in — MUST exist in [RepoIR.files](RepoIR.md#files).

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/repo-ir.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L143)

Stable identity (host convention: `"<file>#<name>"`).

***

### kind

> `readonly` **kind**: [`SymbolKind`](../type-aliases/SymbolKind.md)

Defined in: [gauntlet/src/repo-ir.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L147)

What kind of declaration this is — the host's normalized syntactic kind.

***

### location

> `readonly` **location**: [`SourceLocation`](SourceLocation.md)

Defined in: [gauntlet/src/repo-ir.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L151)

Where the declaration points.

***

### name

> `readonly` **name**: `string`

Defined in: [gauntlet/src/repo-ir.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L145)

The declared/exported name.

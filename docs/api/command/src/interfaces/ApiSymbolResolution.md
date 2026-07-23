[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ApiSymbolResolution

# Interface: ApiSymbolResolution

Defined in: [command/src/registry.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L25)

The owning-package resolution for one exported symbol — what the injected
[CommandContext.resolveApiSymbol](CommandContext.md#resolveapisymbol) capability returns, and what the
`explain` command projects into its `symbol` arm. `package` is the owning
publishable scope (a `PACKAGE_METADATA_CATALOG` key); `subpath` is a real
non-null package export through which the symbol is consumer-importable;
`file` is the repo-relative source file the symbol is declared in (or the
published declaration file in an installed package);
`summary` is the first paragraph of that declaration's leading TSDoc. Declared
here so the contract lives in `@liteship/command` without an import of the
CLI-side api-index that produces it (the CLI injects it; over MCP the capability
is absent and a symbol lookup degrades to `unresolved`).

## Properties

### file

> `readonly` **file**: `string`

Defined in: [command/src/registry.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L33)

Repo-relative source file the symbol is declared in.

***

### kind

> `readonly` **kind**: `string`

Defined in: [command/src/registry.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L35)

The declaration kind (`function` / `const` / `class` / `interface` / `type` / `enum`).

***

### package

> `readonly` **package**: `string`

Defined in: [command/src/registry.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L29)

The owning publishable scope (a `PACKAGE_METADATA_CATALOG` key).

***

### packageDescription

> `readonly` **packageDescription**: `string`

Defined in: [command/src/registry.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L39)

The owning package's answer-first `description` from `PACKAGE_METADATA_CATALOG`.

***

### subpath

> `readonly` **subpath**: `string`

Defined in: [command/src/registry.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L31)

The public import subpath the symbol is reachable from (`.` for the main barrel).

***

### summary

> `readonly` **summary**: `string`

Defined in: [command/src/registry.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L37)

The first paragraph of the declaration's leading TSDoc (empty when it carries none).

***

### symbol

> `readonly` **symbol**: `string`

Defined in: [command/src/registry.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L27)

The exported symbol name that was resolved.

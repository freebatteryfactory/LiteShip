[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / ExplainSymbol

# Interface: ExplainSymbol

Defined in: [command/src/commands/explain.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L82)

An exported symbol plus the curated facade context available for it.

## Extends

- [`ApiSymbolResolution`](ApiSymbolResolution.md)

## Properties

### file

> `readonly` **file**: `string`

Defined in: [command/src/registry.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L33)

Repo-relative source file the symbol is declared in.

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`file`](ApiSymbolResolution.md#file)

***

### kind

> `readonly` **kind**: `string`

Defined in: [command/src/registry.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L35)

The declaration kind (`function` / `const` / `class` / `interface` / `type` / `enum`).

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`kind`](ApiSymbolResolution.md#kind)

***

### package

> `readonly` **package**: `string`

Defined in: [command/src/registry.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L29)

The owning publishable scope (a `PACKAGE_METADATA_CATALOG` key).

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`package`](ApiSymbolResolution.md#package)

***

### packageDescription

> `readonly` **packageDescription**: `string`

Defined in: [command/src/registry.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L39)

The owning package's answer-first `description` from `PACKAGE_METADATA_CATALOG`.

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`packageDescription`](ApiSymbolResolution.md#packagedescription)

***

### subpath

> `readonly` **subpath**: `string`

Defined in: [command/src/registry.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L31)

The public import subpath the symbol is reachable from (`.` for the main barrel).

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`subpath`](ApiSymbolResolution.md#subpath)

***

### summary

> `readonly` **summary**: `string`

Defined in: [command/src/registry.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L37)

The first paragraph of the declaration's leading TSDoc (empty when it carries none).

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`summary`](ApiSymbolResolution.md#summary)

***

### surface

> `readonly` **surface**: [`PublicSymbolContext`](PublicSymbolContext.md) \| `null`

Defined in: [command/src/commands/explain.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L83)

***

### symbol

> `readonly` **symbol**: `string`

Defined in: [command/src/registry.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L27)

The exported symbol name that was resolved.

#### Inherited from

[`ApiSymbolResolution`](ApiSymbolResolution.md).[`symbol`](ApiSymbolResolution.md#symbol)

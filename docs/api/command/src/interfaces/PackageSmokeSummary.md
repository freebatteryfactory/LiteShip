[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PackageSmokeSummary

# Interface: PackageSmokeSummary

Defined in: [command/src/registry.ts:355](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L355)

Structured verdict returned by the injected [CommandContext.runPackageSmoke](CommandContext.md#runpackagesmoke)
capability — the release-grade pack/install/import smoke. `ok` ⟺ every package
packed, installed, carried no `workspace:` leak, and every declared module
specifier (plus the `liteship` binstub) resolved. `failedStep` + `failure` carry the
bracketed step label and message of the first failure (so a CI log identifies it
without artifact download). Declared here so the `package-smoke` command's
contract lives in `@liteship/command` without an import of the heavy CLI engine.

## Properties

### failedStep

> `readonly` **failedStep**: `string` \| `null`

Defined in: [command/src/registry.ts:362](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L362)

The bracketed step label of the first failure, or null on success.

***

### failure

> `readonly` **failure**: `string` \| `null`

Defined in: [command/src/registry.ts:364](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L364)

The failure message of the first failure, or null on success.

***

### importsSmoked

> `readonly` **importsSmoked**: `number`

Defined in: [command/src/registry.ts:360](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L360)

Number of module specifiers the import-smoke resolved (0 when it never ran).

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:356](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L356)

***

### packagesPacked

> `readonly` **packagesPacked**: `number`

Defined in: [command/src/registry.ts:358](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L358)

Number of `@liteship/*` (+ unscoped) scopes packed via `pnpm pack`.

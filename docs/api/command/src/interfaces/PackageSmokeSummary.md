[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PackageSmokeSummary

# Interface: PackageSmokeSummary

Defined in: [command/src/registry.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L300)

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

Defined in: [command/src/registry.ts:307](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L307)

The bracketed step label of the first failure, or null on success.

***

### failure

> `readonly` **failure**: `string` \| `null`

Defined in: [command/src/registry.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L309)

The failure message of the first failure, or null on success.

***

### importsSmoked

> `readonly` **importsSmoked**: `number`

Defined in: [command/src/registry.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L305)

Number of module specifiers the import-smoke resolved (0 when it never ran).

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L301)

***

### packagesPacked

> `readonly` **packagesPacked**: `number`

Defined in: [command/src/registry.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L303)

Number of `@liteship/*` (+ unscoped) scopes packed via `pnpm pack`.

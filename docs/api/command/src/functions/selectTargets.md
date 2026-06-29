[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / selectTargets

# Function: selectTargets()

> **selectTargets**(`workspace`, `filter`): [`WorkspacePackage`](../interfaces/WorkspacePackage.md)[]

Defined in: [command/src/commands/ship-planning.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/ship-planning.ts#L48)

Select the packages to ship. No filter → all non-private packages. A filter
matches either a relative path (`./packages/core`) or a package name.

## Parameters

### workspace

readonly [`WorkspacePackage`](../interfaces/WorkspacePackage.md)[]

### filter

`string` \| `undefined`

## Returns

[`WorkspacePackage`](../interfaces/WorkspacePackage.md)[]

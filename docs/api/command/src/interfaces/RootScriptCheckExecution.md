[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / RootScriptCheckExecution

# Interface: RootScriptCheckExecution

Defined in: [command/src/checks/definition.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L119)

A repository-owned package-script execution.

## Properties

### args

> `readonly` **args**: readonly `string`[]

Defined in: [command/src/checks/definition.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L124)

Arguments forwarded after the script invocation, preserving their exact token spelling.

***

### invocation

> `readonly` **invocation**: `"pnpm-run"` \| `"pnpm-test"`

Defined in: [command/src/checks/definition.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L126)

`pnpm test` is a real shorthand with distinct spelling; every other script uses `pnpm run`.

***

### kind

> `readonly` **kind**: `"root-script"`

Defined in: [command/src/checks/definition.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L120)

***

### script

> `readonly` **script**: `string`

Defined in: [command/src/checks/definition.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L122)

Root `package.json#scripts` key that owns the assertion.

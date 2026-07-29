[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / parseRootScriptCheckExecution

# Function: parseRootScriptCheckExecution()

> **parseRootScriptCheckExecution**(`command`): [`RootScriptCheckExecution`](../interfaces/RootScriptCheckExecution.md) \| `null`

Defined in: [command/src/checks/definition.ts:143](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L143)

Parse the exact root-script command dialect admitted by the repository check
registry. Returning `null` makes an unowned shell pipeline unrepresentable as
a repository check without silently guessing its assertion owner.

## Parameters

### command

`string`

## Returns

[`RootScriptCheckExecution`](../interfaces/RootScriptCheckExecution.md) \| `null`

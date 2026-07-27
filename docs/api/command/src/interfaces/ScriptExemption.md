[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ScriptExemption

# Interface: ScriptExemption

Defined in: [command/src/checks/script-exemptions.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/script-exemptions.ts#L18)

One exempt root script: its `package.json` script name → the one-line reason it is not a registered check.

## Properties

### reason

> `readonly` **reason**: `string`

Defined in: [command/src/checks/script-exemptions.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/script-exemptions.ts#L22)

The one-line reason this script is a workflow/component/alias/helper, not a distinct check.

***

### script

> `readonly` **script**: `string`

Defined in: [command/src/checks/script-exemptions.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/script-exemptions.ts#L20)

The exact `package.json` script name (the key under `scripts`).

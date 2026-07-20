[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / failed

# Function: failed()

> **failed**\<`P`\>(`command`, `payload`, `exitCode?`): [`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`P`\>

Defined in: [command/src/registry.ts:526](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L526)

Stamp a FAILURE envelope: `status: 'failed'` + the wall-clock timestamp + the
`exitCode` (default 1) + the typed payload. The dispatcher builds its own
structural failures (unknown_command / no_registry_handler / invalid_args)
through this; handlers build their domain failures through it too, so the
envelope shape lives in exactly one place.

## Type Parameters

### P

`P`

## Parameters

### command

`string`

### payload

`P`

### exitCode?

`number` = `1`

## Returns

[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`P`\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ok

# Function: ok()

> **ok**\<`P`\>(`command`, `payload`): [`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`P`\>

Defined in: [command/src/registry.ts:469](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L469)

Stamp a SUCCESS envelope: `status: 'ok'` + the volatile wall-clock timestamp +
the typed payload, no `exitCode` (ok maps to 0 at the adapter). The command
name is threaded ONCE here instead of repeated on every return path in a
handler. Generic over the payload so `ok('glossary', payload)` yields a
`CapsuleCommandResult<GlossaryPayload>`.

## Type Parameters

### P

`P`

## Parameters

### command

`string`

### payload

`P`

## Returns

[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`P`\>

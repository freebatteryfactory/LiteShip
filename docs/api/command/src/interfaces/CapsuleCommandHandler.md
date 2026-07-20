[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleCommandHandler

# Interface: CapsuleCommandHandler()\<Args, Payload\>

Defined in: [command/src/registry.ts:522](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L522)

A command handler: structured invocation in, structured result out. No stdout,
no argv. Generic over the DECODED `Args` (what the dispatcher hands the handler
after decoding `invocation.args` against the command's declared [RegisteredCommand.argsSchema](RegisteredCommand.md#argsschema)) and the `Payload` it returns. The defaults keep
a legacy handler — reading loosely-typed `invocation.args` and returning an
`unknown` payload — assignable, so migration is opt-in per command.

## Type Parameters

### Args

`Args` *extends* `Readonly`\<`Record`\<`string`, `unknown`\>\> = `Readonly`\<`Record`\<`string`, `unknown`\>\>

### Payload

`Payload` = `unknown`

> **CapsuleCommandHandler**(`invocation`, `context`): `Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`Payload`\>\>

Defined in: [command/src/registry.ts:526](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L526)

A command handler: structured invocation in, structured result out. No stdout,
no argv. Generic over the DECODED `Args` (what the dispatcher hands the handler
after decoding `invocation.args` against the command's declared [RegisteredCommand.argsSchema](RegisteredCommand.md#argsschema)) and the `Payload` it returns. The defaults keep
a legacy handler — reading loosely-typed `invocation.args` and returning an
`unknown` payload — assignable, so migration is opt-in per command.

## Parameters

### invocation

#### args

`Args`

#### name

`string`

### context

[`CommandContext`](CommandContext.md)

## Returns

`Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`Payload`\>\>

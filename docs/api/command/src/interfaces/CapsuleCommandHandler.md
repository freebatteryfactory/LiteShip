[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleCommandHandler

# Interface: CapsuleCommandHandler()

Defined in: [command/src/registry.ts:463](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L463)

A command handler: structured invocation in, structured result out. No stdout, no argv.

> **CapsuleCommandHandler**(`invocation`, `context`): `Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\>

Defined in: [command/src/registry.ts:464](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L464)

A command handler: structured invocation in, structured result out. No stdout, no argv.

## Parameters

### invocation

`CapsuleCommandInvocation`

### context

[`CommandContext`](CommandContext.md)

## Returns

`Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleCommandHandler

# Interface: CapsuleCommandHandler()

Defined in: [command/src/registry.ts:460](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L460)

A command handler: structured invocation in, structured result out. No stdout, no argv.

> **CapsuleCommandHandler**(`invocation`, `context`): `Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\>

Defined in: [command/src/registry.ts:461](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/registry.ts#L461)

A command handler: structured invocation in, structured result out. No stdout, no argv.

## Parameters

### invocation

`CapsuleCommandInvocation`

### context

[`CommandContext`](CommandContext.md)

## Returns

`Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\>

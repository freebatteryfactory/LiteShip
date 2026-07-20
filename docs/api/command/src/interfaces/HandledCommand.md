[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / HandledCommand

# Interface: HandledCommand

Defined in: [command/src/registry.ts:598](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L598)

A fully-migrated command: descriptor + a guaranteed handler. Migrated command
modules type their export as this so adapters can invoke `.handler` directly
without a presence check. Assignable to [RegisteredCommand](RegisteredCommand.md).

## Extends

- [`RegisteredCommand`](RegisteredCommand.md)

## Properties

### argsSchema?

> `readonly` `optional` **argsSchema?**: `Schema`\<`Readonly`\<`Record`\<`string`, `unknown`\>\>, `Readonly`\<`Record`\<`string`, `unknown`\>\>\>

Defined in: [command/src/registry.ts:590](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L590)

The declared kernel schema for the command's args. When present, the
dispatcher decodes `invocation.args` against it BEFORE invoking the handler
— a mistyped arg fails structurally with an `invalid_args` envelope instead
of reaching the handler, and the handler receives the decoded, typed args.
Absent for a handler that still reads `invocation.args` loosely (the decode
step is then a no-op passthrough).

#### Inherited from

[`RegisteredCommand`](RegisteredCommand.md).[`argsSchema`](RegisteredCommand.md#argsschema)

***

### descriptor

> `readonly` **descriptor**: `CapsuleCommandDescriptor`

Defined in: [command/src/registry.ts:580](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L580)

#### Inherited from

[`RegisteredCommand`](RegisteredCommand.md).[`descriptor`](RegisteredCommand.md#descriptor)

***

### handler

> `readonly` **handler**: [`CapsuleCommandHandler`](CapsuleCommandHandler.md)

Defined in: [command/src/registry.ts:599](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L599)

#### Overrides

[`RegisteredCommand`](RegisteredCommand.md).[`handler`](RegisteredCommand.md#handler)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / RegisteredCommand

# Interface: RegisteredCommand

Defined in: [command/src/registry.ts:666](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L666)

A descriptor paired with its handler — the unit the registry indexes. The
handler is optional: a descriptor-only entry declares a command's identity in
the canonical catalog while its handler is still legacy-backed (routed by the
CLI's own dispatch) and pending migration into this package.

## Extended by

- [`HandledCommand`](HandledCommand.md)

## Properties

### argsSchema?

> `readonly` `optional` **argsSchema?**: [`Schema`](../../../liteship/src/schema/interfaces/Schema.md)\<`Readonly`\<`Record`\<`string`, `unknown`\>\>, `Readonly`\<`Record`\<`string`, `unknown`\>\>\>

Defined in: [command/src/registry.ts:677](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L677)

The declared kernel schema for the command's args. When present, the
dispatcher decodes `invocation.args` against it BEFORE invoking the handler
— a mistyped arg fails structurally with an `invalid_args` envelope instead
of reaching the handler, and the handler receives the decoded, typed args.
Absent for a handler that still reads `invocation.args` loosely (the decode
step is then a no-op passthrough).

***

### descriptor

> `readonly` **descriptor**: [`CapsuleCommandDescriptor`](../../../spine/interfaces/CapsuleCommandDescriptor.md)

Defined in: [command/src/registry.ts:667](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L667)

***

### handler?

> `readonly` `optional` **handler?**: [`CapsuleCommandHandler`](CapsuleCommandHandler.md)\<`Readonly`\<`Record`\<`string`, `unknown`\>\>, `unknown`\>

Defined in: [command/src/registry.ts:668](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L668)

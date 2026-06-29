[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / RegisteredCommand

# Interface: RegisteredCommand

Defined in: [command/src/registry.ts:473](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L473)

A descriptor paired with its handler — the unit the registry indexes. The
handler is optional: a descriptor-only entry declares a command's identity in
the canonical catalog while its handler is still legacy-backed (routed by the
CLI's own dispatch) and pending migration into this package.

## Extended by

- [`HandledCommand`](HandledCommand.md)

## Properties

### descriptor

> `readonly` **descriptor**: `CapsuleCommandDescriptor`

Defined in: [command/src/registry.ts:474](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L474)

***

### handler?

> `readonly` `optional` **handler?**: [`CapsuleCommandHandler`](CapsuleCommandHandler.md)

Defined in: [command/src/registry.ts:475](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L475)

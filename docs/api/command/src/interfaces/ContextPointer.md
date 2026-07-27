[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ContextPointer

# Interface: ContextPointer

Defined in: [command/src/commands/context-map.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context-map.ts#L21)

One ordered pointer in a task's context — a real file + why it matters.

## Properties

### checkId

> `readonly` **checkId**: `string` \| `null`

Defined in: [command/src/commands/context-map.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context-map.ts#L29)

The `check/<slug>` id when `kind === 'check'`, else null.

***

### kind

> `readonly` **kind**: [`ContextPointerKind`](../type-aliases/ContextPointerKind.md)

Defined in: [command/src/commands/context-map.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context-map.ts#L23)

How to treat this pointer (owner file / public entrypoint / a check / a proving test / a doc).

***

### note

> `readonly` **note**: `string`

Defined in: [command/src/commands/context-map.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context-map.ts#L27)

One line on why this file is in the task's context.

***

### path

> `readonly` **path**: `string`

Defined in: [command/src/commands/context-map.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context-map.ts#L25)

Repo-relative path — always a real file (the context test asserts existence).

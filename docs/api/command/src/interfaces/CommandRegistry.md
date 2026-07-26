[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CommandRegistry

# Interface: CommandRegistry

Defined in: [command/src/registry.ts:650](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L650)

## Properties

### get

> `readonly` **get**: (`name`) => [`RegisteredCommand`](RegisteredCommand.md) \| `undefined`

Defined in: [command/src/registry.ts:651](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L651)

#### Parameters

##### name

`string`

#### Returns

[`RegisteredCommand`](RegisteredCommand.md) \| `undefined`

***

### list

> `readonly` **list**: () => readonly `CapsuleCommandDescriptor`[]

Defined in: [command/src/registry.ts:652](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L652)

#### Returns

readonly `CapsuleCommandDescriptor`[]

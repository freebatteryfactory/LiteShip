[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CommandRegistry

# Interface: CommandRegistry

Defined in: [command/src/registry.ts:722](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L722)

Validated command catalog plus lookup and execution operations.

## Properties

### get

> `readonly` **get**: (`name`) => [`RegisteredCommand`](RegisteredCommand.md) \| `undefined`

Defined in: [command/src/registry.ts:723](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L723)

#### Parameters

##### name

`string`

#### Returns

[`RegisteredCommand`](RegisteredCommand.md) \| `undefined`

***

### list

> `readonly` **list**: () => readonly [`CapsuleCommandDescriptor`](../../../spine/interfaces/CapsuleCommandDescriptor.md)[]

Defined in: [command/src/registry.ts:724](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L724)

#### Returns

readonly [`CapsuleCommandDescriptor`](../../../spine/interfaces/CapsuleCommandDescriptor.md)[]

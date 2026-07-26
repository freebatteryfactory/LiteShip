[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckInvariantEntry

# Interface: CheckInvariantEntry

Defined in: [command/src/commands/check-invariants-registry.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants-registry.ts#L26)

One banned-pattern rule: a regex scoped to `dirs`, minus explicit exemptions.

## Properties

### dirs

> `readonly` **dirs**: readonly `string`[]

Defined in: [command/src/commands/check-invariants-registry.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants-registry.ts#L29)

***

### exemptions?

> `readonly` `optional` **exemptions?**: readonly [`CheckInvariantExemption`](CheckInvariantExemption.md)[]

Defined in: [command/src/commands/check-invariants-registry.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants-registry.ts#L30)

***

### message

> `readonly` **message**: `string`

Defined in: [command/src/commands/check-invariants-registry.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants-registry.ts#L31)

***

### name

> `readonly` **name**: `string`

Defined in: [command/src/commands/check-invariants-registry.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants-registry.ts#L27)

***

### pattern

> `readonly` **pattern**: `RegExp`

Defined in: [command/src/commands/check-invariants-registry.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check-invariants-registry.ts#L28)

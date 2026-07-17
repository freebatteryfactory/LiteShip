[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPayload

# Type Alias: CheckPayload

> **CheckPayload** = `object`

Defined in: [command/src/commands/check.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L88)

Structured payload returned by `check`. Mirrors `CheckPayloadSchema` for every
field EXCEPT `findings`, which keeps the canonical `@czap/gauntlet` `Finding`
type (so `remediation` — undescribable in the outputSchema's dialect — stays in
the type and is never narrowed away from a consumer). The type is a faithful
superset on exactly that one field.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [command/src/commands/check.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L90)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/commands/check.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L91)

***

### findings

> `readonly` **findings**: readonly [`Finding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/finding.ts)[]

Defined in: [command/src/commands/check.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L92)

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/commands/check.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L89)

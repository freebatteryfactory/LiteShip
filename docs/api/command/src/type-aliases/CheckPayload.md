[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPayload

# Type Alias: CheckPayload

> **CheckPayload** = `object`

Defined in: [command/src/commands/check.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L83)

Structured payload returned by `check`. Mirrors `CheckPayloadSchema` for every
field EXCEPT `findings`, which keeps the canonical `@czap/gauntlet` `Finding`
type (so `remediation` — undescribable in the outputSchema's dialect — stays in
the type and is never narrowed away from a consumer). The type is a faithful
superset on exactly that one field.

## Properties

### blocked

> `readonly` **blocked**: `boolean`

Defined in: [command/src/commands/check.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L85)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/commands/check.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L86)

***

### findings

> `readonly` **findings**: readonly [`Finding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/finding.ts)[]

Defined in: [command/src/commands/check.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L87)

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/commands/check.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L84)

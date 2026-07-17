[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditPayload

# Type Alias: AuditPayload

> **AuditPayload** = `object`

Defined in: [command/src/commands/audit.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L84)

Structured payload returned by `audit`. Mirrors `AuditPayloadSchema` for every
field EXCEPT `findings`, which keeps the canonical [AuditEngineFinding](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)
type (so `metadata` — an open record the outputSchema's dialect can't express —
stays in the type and is never narrowed away). The type is a faithful superset
on exactly that one field.

## Properties

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/commands/audit.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L85)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/commands/audit.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L88)

***

### findings?

> `readonly` `optional` **findings?**: readonly [`AuditEngineFinding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)[]

Defined in: [command/src/commands/audit.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L97)

***

### infoCount

> `readonly` **infoCount**: `number`

Defined in: [command/src/commands/audit.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L87)

***

### passFindingCounts

> `readonly` **passFindingCounts**: `object`

Defined in: [command/src/commands/audit.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L90)

#### integrity

> `readonly` **integrity**: `number`

#### structure

> `readonly` **structure**: `number`

#### surface

> `readonly` **surface**: `number`

***

### profileSource

> `readonly` **profileSource**: `"default"` \| `"file"` \| `"consumer"`

Defined in: [command/src/commands/audit.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L96)

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [command/src/commands/audit.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L95)

***

### suppressedCount

> `readonly` **suppressedCount**: `number`

Defined in: [command/src/commands/audit.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L89)

***

### warningCount

> `readonly` **warningCount**: `number`

Defined in: [command/src/commands/audit.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L86)

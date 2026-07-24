[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditEngineSummary

# Interface: AuditEngineSummary

Defined in: [command/src/registry.ts:296](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L296)

Structured summary returned by the injected [CommandContext.runAudit](CommandContext.md#runaudit)
capability — a structural mirror of `@liteship/audit`'s pass result, declared here
so the contract lives in `@liteship/command` without an import of the engine.

## Properties

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:297](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L297)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/registry.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L300)

***

### findings?

> `readonly` `optional` **findings?**: readonly [`AuditEngineFinding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)[]

Defined in: [command/src/registry.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L310)

Present only when the caller asked for findings (`--findings`).

***

### infoCount

> `readonly` **infoCount**: `number`

Defined in: [command/src/registry.ts:299](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L299)

***

### passFindingCounts

> `readonly` **passFindingCounts**: `object`

Defined in: [command/src/registry.ts:302](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L302)

#### integrity

> `readonly` **integrity**: `number`

#### structure

> `readonly` **structure**: `number`

#### surface

> `readonly` **surface**: `number`

***

### profileSource

> `readonly` **profileSource**: `"default"` \| `"file"` \| `"consumer"`

Defined in: [command/src/registry.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L308)

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [command/src/registry.ts:307](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L307)

***

### suppressedCount

> `readonly` **suppressedCount**: `number`

Defined in: [command/src/registry.ts:301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L301)

***

### warningCount

> `readonly` **warningCount**: `number`

Defined in: [command/src/registry.ts:298](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L298)

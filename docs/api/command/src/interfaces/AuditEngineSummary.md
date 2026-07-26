[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditEngineSummary

# Interface: AuditEngineSummary

Defined in: [command/src/registry.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L308)

Structured summary returned by the injected [CommandContext.runAudit](CommandContext.md#runaudit)
capability — a structural mirror of `@liteship/audit`'s pass result, declared here
so the contract lives in `@liteship/command` without an import of the engine.

## Properties

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:309](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L309)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/registry.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L312)

***

### findings?

> `readonly` `optional` **findings?**: readonly [`AuditEngineFinding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)[]

Defined in: [command/src/registry.ts:322](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L322)

Present only when the caller asked for findings (`--findings`).

***

### infoCount

> `readonly` **infoCount**: `number`

Defined in: [command/src/registry.ts:311](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L311)

***

### passFindingCounts

> `readonly` **passFindingCounts**: `object`

Defined in: [command/src/registry.ts:314](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L314)

#### integrity

> `readonly` **integrity**: `number`

#### structure

> `readonly` **structure**: `number`

#### surface

> `readonly` **surface**: `number`

***

### profileSource

> `readonly` **profileSource**: `"default"` \| `"file"` \| `"consumer"`

Defined in: [command/src/registry.ts:320](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L320)

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [command/src/registry.ts:319](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L319)

***

### suppressedCount

> `readonly` **suppressedCount**: `number`

Defined in: [command/src/registry.ts:313](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L313)

***

### warningCount

> `readonly` **warningCount**: `number`

Defined in: [command/src/registry.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L310)

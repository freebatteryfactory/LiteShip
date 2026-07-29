[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / AuditEngineSummary

# Interface: AuditEngineSummary

Defined in: [command/src/registry.ts:300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L300)

Structured summary returned by the injected [CommandContext.runAudit](CommandContext.md#runaudit)
capability — a structural mirror of `@liteship/audit`'s pass result, declared here
so the contract lives in `@liteship/command` without an import of the engine.

## Properties

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L301)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/registry.ts:304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L304)

***

### findings?

> `readonly` `optional` **findings?**: readonly [`AuditEngineFinding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)[]

Defined in: [command/src/registry.ts:314](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L314)

Present only when the caller asked for findings (`--findings`).

***

### infoCount

> `readonly` **infoCount**: `number`

Defined in: [command/src/registry.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L303)

***

### passFindingCounts

> `readonly` **passFindingCounts**: `object`

Defined in: [command/src/registry.ts:306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L306)

#### integrity

> `readonly` **integrity**: `number`

#### structure

> `readonly` **structure**: `number`

#### surface

> `readonly` **surface**: `number`

***

### profileSource

> `readonly` **profileSource**: `"default"` \| `"file"` \| `"consumer"`

Defined in: [command/src/registry.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L312)

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [command/src/registry.ts:311](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L311)

***

### suppressedCount

> `readonly` **suppressedCount**: `number`

Defined in: [command/src/registry.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L305)

***

### warningCount

> `readonly` **warningCount**: `number`

Defined in: [command/src/registry.ts:302](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L302)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditEngineSummary

# Interface: AuditEngineSummary

Defined in: [command/src/registry.ts:259](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L259)

Structured summary returned by the injected [CommandContext.runAudit](CommandContext.md#runaudit)
capability — a structural mirror of `@czap/audit`'s pass result, declared here
so the contract lives in `@czap/command` without an import of the engine.

## Properties

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:260](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L260)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/registry.ts:263](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L263)

***

### findings?

> `readonly` `optional` **findings?**: readonly [`AuditEngineFinding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)[]

Defined in: [command/src/registry.ts:273](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L273)

Present only when the caller asked for findings (`--findings`).

***

### infoCount

> `readonly` **infoCount**: `number`

Defined in: [command/src/registry.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L262)

***

### passFindingCounts

> `readonly` **passFindingCounts**: `object`

Defined in: [command/src/registry.ts:265](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L265)

#### integrity

> `readonly` **integrity**: `number`

#### structure

> `readonly` **structure**: `number`

#### surface

> `readonly` **surface**: `number`

***

### profileSource

> `readonly` **profileSource**: `"default"` \| `"file"` \| `"consumer"`

Defined in: [command/src/registry.ts:271](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L271)

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [command/src/registry.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L270)

***

### suppressedCount

> `readonly` **suppressedCount**: `number`

Defined in: [command/src/registry.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L264)

***

### warningCount

> `readonly` **warningCount**: `number`

Defined in: [command/src/registry.ts:261](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L261)

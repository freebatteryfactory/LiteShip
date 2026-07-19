[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditEngineSummary

# Interface: AuditEngineSummary

Defined in: [command/src/registry.ts:253](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L253)

Structured summary returned by the injected [CommandContext.runAudit](CommandContext.md#runaudit)
capability — a structural mirror of `@liteship/audit`'s pass result, declared here
so the contract lives in `@liteship/command` without an import of the engine.

## Properties

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:254](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L254)

***

### findingCount

> `readonly` **findingCount**: `number`

Defined in: [command/src/registry.ts:257](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L257)

***

### findings?

> `readonly` `optional` **findings?**: readonly [`AuditEngineFinding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts)[]

Defined in: [command/src/registry.ts:267](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L267)

Present only when the caller asked for findings (`--findings`).

***

### infoCount

> `readonly` **infoCount**: `number`

Defined in: [command/src/registry.ts:256](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L256)

***

### passFindingCounts

> `readonly` **passFindingCounts**: `object`

Defined in: [command/src/registry.ts:259](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L259)

#### integrity

> `readonly` **integrity**: `number`

#### structure

> `readonly` **structure**: `number`

#### surface

> `readonly` **surface**: `number`

***

### profileSource

> `readonly` **profileSource**: `"default"` \| `"file"` \| `"consumer"`

Defined in: [command/src/registry.ts:265](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L265)

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [command/src/registry.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L264)

***

### suppressedCount

> `readonly` **suppressedCount**: `number`

Defined in: [command/src/registry.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L258)

***

### warningCount

> `readonly` **warningCount**: `number`

Defined in: [command/src/registry.ts:255](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L255)

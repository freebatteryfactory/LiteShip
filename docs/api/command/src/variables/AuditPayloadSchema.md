[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditPayloadSchema

# Variable: AuditPayloadSchema

> `const` **AuditPayloadSchema**: `object`

Defined in: [command/src/commands/audit.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L29)

The descriptor `outputSchema` for `audit` — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. The modelled `findings` element
faithfully mirrors [AuditEngineFinding](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts) EXCEPT its `metadata?:
Record<string, unknown>` — an open record (index signature) the structural
dialect cannot represent (no `additionalProperties`). [AuditPayload](../type-aliases/AuditPayload.md)
keeps the canonical [AuditEngineFinding](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts) on `findings`, so `metadata`
survives in the type and is never narrowed away.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.errorCount

> `readonly` **errorCount**: `object`

#### properties.errorCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.findingCount

> `readonly` **findingCount**: `object`

#### properties.findingCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.findings

> `readonly` **findings**: `object`

Present only when `--findings` was requested — receipt shape is stable by default.

#### properties.findings.items

> `readonly` **items**: `object`

#### properties.findings.items.properties

> `readonly` **properties**: `object`

#### properties.findings.items.properties.id

> `readonly` **id**: `object`

#### properties.findings.items.properties.id.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.location

> `readonly` **location**: `object`

#### properties.findings.items.properties.location.properties

> `readonly` **properties**: `object`

#### properties.findings.items.properties.location.properties.column

> `readonly` **column**: `object`

#### properties.findings.items.properties.location.properties.column.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.findings.items.properties.location.properties.file

> `readonly` **file**: `object`

#### properties.findings.items.properties.location.properties.file.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.location.properties.line

> `readonly` **line**: `object`

#### properties.findings.items.properties.location.properties.line.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.findings.items.properties.location.required

> `readonly` **required**: readonly \[`"file"`\]

#### properties.findings.items.properties.location.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.findings.items.properties.rule

> `readonly` **rule**: `object`

#### properties.findings.items.properties.rule.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.section

> `readonly` **section**: `object`

#### properties.findings.items.properties.section.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.severity

> `readonly` **severity**: `object`

#### properties.findings.items.properties.severity.enum

> `readonly` **enum**: readonly \[`"error"`, `"warning"`, `"info"`\]

#### properties.findings.items.properties.summary

> `readonly` **summary**: `object`

#### properties.findings.items.properties.summary.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.title

> `readonly` **title**: `object`

#### properties.findings.items.properties.title.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.required

> `readonly` **required**: readonly \[`"id"`, `"section"`, `"rule"`, `"severity"`, `"title"`, `"summary"`\]

#### properties.findings.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.findings.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.infoCount

> `readonly` **infoCount**: `object`

#### properties.infoCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.passFindingCounts

> `readonly` **passFindingCounts**: `object`

#### properties.passFindingCounts.properties

> `readonly` **properties**: `object`

#### properties.passFindingCounts.properties.integrity

> `readonly` **integrity**: `object`

#### properties.passFindingCounts.properties.integrity.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.passFindingCounts.properties.structure

> `readonly` **structure**: `object`

#### properties.passFindingCounts.properties.structure.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.passFindingCounts.properties.surface

> `readonly` **surface**: `object`

#### properties.passFindingCounts.properties.surface.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.passFindingCounts.required

> `readonly` **required**: readonly \[`"structure"`, `"integrity"`, `"surface"`\]

#### properties.passFindingCounts.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.profileSource

> `readonly` **profileSource**: `object`

#### properties.profileSource.enum

> `readonly` **enum**: readonly \[`"default"`, `"file"`, `"consumer"`\]

#### properties.repoRoot

> `readonly` **repoRoot**: `object`

#### properties.repoRoot.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.suppressedCount

> `readonly` **suppressedCount**: `object`

#### properties.suppressedCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.warningCount

> `readonly` **warningCount**: `object`

#### properties.warningCount.type

> `readonly` **type**: `"number"` = `'number'`

### required

> `readonly` **required**: readonly \[`"errorCount"`, `"warningCount"`, `"infoCount"`, `"findingCount"`, `"suppressedCount"`, `"passFindingCounts"`, `"repoRoot"`, `"profileSource"`\]

### type

> `readonly` **type**: `"object"` = `'object'`

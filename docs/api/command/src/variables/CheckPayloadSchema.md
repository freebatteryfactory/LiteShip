[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPayloadSchema

# Variable: CheckPayloadSchema

> `const` **CheckPayloadSchema**: `object`

Defined in: [command/src/commands/check.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/check.ts#L49)

The descriptor `outputSchema` for `check` — the WELD-2 Finding-carrying shape,
hand-written JSON-Schema and byte-parity-pinned against the parity fixture. The
`findings` ARE plain JSON-serializable [Finding](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/finding.ts) data (ruleId, severity,
level, title, detail, location?, remediation?), so they ride the
`CapsuleCommandResult` payload straight through the MCP dispatch's
`structuredContent` and the CLI receipt with no separate adapter. `blocked`
mirrors the engine's single blocking verdict; `ok` is its negation.

The modelled `findings` element faithfully mirrors `@czap/gauntlet`'s `Finding`
EXCEPT its `remediation?` — a heterogeneous non-literal union
(`{kind:'patch',…} | {kind:'instruction',…}`) the structural dialect cannot
represent soundly (no `oneOf`). `CheckPayload` below keeps the canonical
`Finding` type (remediation included), so no capability is narrowed away from
consumers — `remediation` still rides the payload at runtime and through
`structuredContent`, it is merely absent from the JSON-Schema description. The
modelled fields are pinned against the canonical `Finding` by a drift-guard in
tests/unit/command/check.test.ts, so this subset can't silently diverge.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.blocked

> `readonly` **blocked**: `object`

True iff a self-proven (blocking) gate emitted an error, or a waiver expired/was forbidden.

#### properties.blocked.type

> `readonly` **type**: `"boolean"` = `'boolean'`

#### properties.findingCount

> `readonly` **findingCount**: `object`

Number of kept findings across all gates (post-waiver, authority applied).

#### properties.findingCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.findings

> `readonly` **findings**: `object`

The kept findings — the actionable work-list a human or agent reads.

#### properties.findings.items

> `readonly` **items**: `object`

#### properties.findings.items.properties

> `readonly` **properties**: `object`

#### properties.findings.items.properties.detail

> `readonly` **detail**: `object`

#### properties.findings.items.properties.detail.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.level

> `readonly` **level**: `object`

#### properties.findings.items.properties.level.enum

> `readonly` **enum**: readonly \[`"L0"`, `"L1"`, `"L2"`, `"L3"`, `"L4"`\]

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

#### properties.findings.items.properties.ruleId

> `readonly` **ruleId**: `object`

#### properties.findings.items.properties.ruleId.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.properties.severity

> `readonly` **severity**: `object`

#### properties.findings.items.properties.severity.enum

> `readonly` **enum**: readonly \[`"advisory"`, `"warning"`, `"error"`\]

#### properties.findings.items.properties.title

> `readonly` **title**: `object`

#### properties.findings.items.properties.title.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.findings.items.required

> `readonly` **required**: readonly \[`"ruleId"`, `"severity"`, `"level"`, `"title"`, `"detail"`\]

#### properties.findings.items.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.findings.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.ok

> `readonly` **ok**: `object`

#### properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

### required

> `readonly` **required**: readonly \[`"ok"`, `"blocked"`, `"findingCount"`, `"findings"`\]

### type

> `readonly` **type**: `"object"` = `'object'`

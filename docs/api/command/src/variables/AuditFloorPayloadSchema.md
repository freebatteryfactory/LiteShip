[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditFloorPayloadSchema

# Variable: AuditFloorPayloadSchema

> `const` **AuditFloorPayloadSchema**: `object`

Defined in: [command/src/commands/audit-floor.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit-floor.ts#L32)

The descriptor `outputSchema` for `audit-floor` — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. `delta` is a modelled nested
struct (the validator recurses into it), tighter than a bare `{type:'object'}`.
[AuditFloorPayload](../type-aliases/AuditFloorPayload.md) is its plain-TS mirror.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.actualWarnings

> `readonly` **actualWarnings**: `object`

Number of `rule@file` warning keys the engine actually surfaced.

#### properties.actualWarnings.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.delta

> `readonly` **delta**: `object`

Warning-inventory drift against the floor: `added` are new, `removed` are gone.

#### properties.delta.properties

> `readonly` **properties**: `object`

#### properties.delta.properties.added

> `readonly` **added**: `object`

#### properties.delta.properties.added.items

> `readonly` **items**: `object`

#### properties.delta.properties.added.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.delta.properties.added.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.delta.properties.removed

> `readonly` **removed**: `object`

#### properties.delta.properties.removed.items

> `readonly` **items**: `object`

#### properties.delta.properties.removed.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.delta.properties.removed.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.delta.required

> `readonly` **required**: readonly \[`"added"`, `"removed"`\]

#### properties.delta.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.errorCount

> `readonly` **errorCount**: `object`

Error-severity findings across all three passes — any error fails the gate.

#### properties.errorCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.expectedWarnings

> `readonly` **expectedWarnings**: `object`

Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`).

#### properties.expectedWarnings.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.inventory

> `readonly` **inventory**: `object`

The sorted `rule@file` warning inventory the engine surfaced.

#### properties.inventory.items

> `readonly` **items**: `object`

#### properties.inventory.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.inventory.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.ok

> `readonly` **ok**: `object`

#### properties.ok.type

> `readonly` **type**: `"boolean"` = `'boolean'`

### required

> `readonly` **required**: readonly \[`"ok"`, `"expectedWarnings"`, `"actualWarnings"`, `"errorCount"`, `"delta"`, `"inventory"`\]

### type

> `readonly` **type**: `"object"` = `'object'`

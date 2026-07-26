[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditFloorSummary

# Interface: AuditFloorSummary

Defined in: [command/src/registry.ts:332](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L332)

Structured verdict returned by the injected [CommandContext.runAuditFloor](CommandContext.md#runauditfloor)
capability — the artifact-independent three-pass warning floor, diffed against
the pinned `AUDIT_WARNING_FLOOR`. `ok` ⟺ no warning drift (no added/removed
inventory keys) AND no errors. Declared here so the `audit-floor` command's
contract lives in `@liteship/command` without an import of the heavy engine.

## Properties

### actualWarnings

> `readonly` **actualWarnings**: `number`

Defined in: [command/src/registry.ts:337](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L337)

Number of `rule@file` warning keys the engine actually surfaced.

***

### delta

> `readonly` **delta**: `object`

Defined in: [command/src/registry.ts:341](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L341)

Warning-inventory drift against the floor: `added` are new, `removed` are gone.

#### added

> `readonly` **added**: readonly `string`[]

#### removed

> `readonly` **removed**: readonly `string`[]

***

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:339](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L339)

Error-severity findings across all three passes — any error fails the gate.

***

### expectedWarnings

> `readonly` **expectedWarnings**: `number`

Defined in: [command/src/registry.ts:335](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L335)

Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`).

***

### inventory

> `readonly` **inventory**: readonly `string`[]

Defined in: [command/src/registry.ts:343](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L343)

The sorted `rule@file` warning inventory the engine surfaced.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:333](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L333)

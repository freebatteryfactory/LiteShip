[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditFloorSummary

# Interface: AuditFloorSummary

Defined in: [command/src/registry.ts:283](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L283)

Structured verdict returned by the injected [CommandContext.runAuditFloor](CommandContext.md#runauditfloor)
capability — the artifact-independent three-pass warning floor, diffed against
the pinned `AUDIT_WARNING_FLOOR`. `ok` ⟺ no warning drift (no added/removed
inventory keys) AND no errors. Declared here so the `audit-floor` command's
contract lives in `@czap/command` without an import of the heavy engine.

## Properties

### actualWarnings

> `readonly` **actualWarnings**: `number`

Defined in: [command/src/registry.ts:288](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L288)

Number of `rule@file` warning keys the engine actually surfaced.

***

### delta

> `readonly` **delta**: `object`

Defined in: [command/src/registry.ts:292](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L292)

Warning-inventory drift against the floor: `added` are new, `removed` are gone.

#### added

> `readonly` **added**: readonly `string`[]

#### removed

> `readonly` **removed**: readonly `string`[]

***

### errorCount

> `readonly` **errorCount**: `number`

Defined in: [command/src/registry.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L290)

Error-severity findings across all three passes — any error fails the gate.

***

### expectedWarnings

> `readonly` **expectedWarnings**: `number`

Defined in: [command/src/registry.ts:286](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L286)

Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`).

***

### inventory

> `readonly` **inventory**: readonly `string`[]

Defined in: [command/src/registry.ts:294](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L294)

The sorted `rule@file` warning inventory the engine surfaced.

***

### ok

> `readonly` **ok**: `boolean`

Defined in: [command/src/registry.ts:284](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L284)

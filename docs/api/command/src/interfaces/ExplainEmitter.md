[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ExplainEmitter

# Interface: ExplainEmitter

Defined in: [command/src/commands/explain.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L55)

The emitter that produces a diagnostic code, plus its negative-control pointer.
A flat, nullable shape (not a discriminated union) so it validates cleanly
against the structural [ExplainPayloadSchema](../variables/ExplainPayloadSchema.md):
- `kind: 'gate'`  — a gauntlet gate ruleId; `id` is the derived gate id, and when
  a blocking check proves that gate its `negativeControl` + `provenByCheck` are set.
- `kind: 'check'` — a P11 `check/<slug>`; `id`/`owner`/`command`/`authority`/
  `negativeControl` come from the [CheckDefinition](../type-aliases/CheckDefinition.md).
- `kind: 'domain'` — a runtime/domain diagnostic; `id` is the stable code and
  `owner` comes from the diagnostic registry.

## Properties

### authority

> `readonly` **authority**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L68)

The check's authority over the verdict (`blocking` / `advisory`), or null.

***

### command

> `readonly` **command**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L66)

The check's root-script command line, or null.

***

### id

> `readonly` **id**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L58)

The emitting gate id, check id, or stable domain diagnostic code.

***

### kind

> `readonly` **kind**: `"gate"` \| `"check"` \| `"domain"`

Defined in: [command/src/commands/explain.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L56)

***

### negativeControl

> `readonly` **negativeControl**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L60)

The red-fixture / negative-control file that proves the emitter can fail, or null.

***

### owner

> `readonly` **owner**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L64)

The check's owner (where the assertion lives), or null.

***

### provenByCheck

> `readonly` **provenByCheck**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L62)

The check id whose negative control proves this gauntlet gate, or null.

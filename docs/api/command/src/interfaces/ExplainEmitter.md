[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / ExplainEmitter

# Interface: ExplainEmitter

Defined in: [command/src/commands/explain.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L50)

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

Defined in: [command/src/commands/explain.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L63)

The check's authority over the verdict (`blocking` / `advisory`), or null.

***

### command

> `readonly` **command**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L61)

The check's root-script command line, or null.

***

### id

> `readonly` **id**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L53)

The emitting gate id, check id, or stable domain diagnostic code.

***

### kind

> `readonly` **kind**: `"gate"` \| `"check"` \| `"domain"`

Defined in: [command/src/commands/explain.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L51)

***

### negativeControl

> `readonly` **negativeControl**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L55)

The red-fixture / negative-control file that proves the emitter can fail, or null.

***

### owner

> `readonly` **owner**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L59)

The check's owner (where the assertion lives), or null.

***

### provenByCheck

> `readonly` **provenByCheck**: `string` \| `null`

Defined in: [command/src/commands/explain.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/explain.ts#L57)

The check id whose negative control proves this gauntlet gate, or null.

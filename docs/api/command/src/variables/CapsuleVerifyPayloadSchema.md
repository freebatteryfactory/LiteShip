[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleVerifyPayloadSchema

# Variable: CapsuleVerifyPayloadSchema

> `const` **CapsuleVerifyPayloadSchema**: `object`

Defined in: [command/src/commands/capsule-verify.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L38)

The descriptor `outputSchema` for `capsule-verify` — hand-written JSON-Schema,
byte-parity-pinned against the parity fixture. `benches` recurses into the real
total/real/placeholder shape (tighter than a bare object) and mirrors
[CapsuleBenchClassification](../interfaces/CapsuleBenchClassification.md). [CapsuleVerifyPayload](../type-aliases/CapsuleVerifyPayload.md) is its plain-TS
mirror.

## Type Declaration

### properties

> `readonly` **properties**: `object`

#### properties.benches

> `readonly` **benches**: `object`

Per-corpus bench-honesty classification (total / real / placeholder names).

#### properties.benches.properties

> `readonly` **properties**: `object`

#### properties.benches.properties.placeholder

> `readonly` **placeholder**: `object`

#### properties.benches.properties.placeholder.items

> `readonly` **items**: `object`

#### properties.benches.properties.placeholder.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.benches.properties.placeholder.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.benches.properties.real

> `readonly` **real**: `object`

#### properties.benches.properties.real.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.benches.properties.total

> `readonly` **total**: `object`

#### properties.benches.properties.total.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.benches.required

> `readonly` **required**: readonly \[`"total"`, `"real"`, `"placeholder"`\]

#### properties.benches.type

> `readonly` **type**: `"object"` = `'object'`

#### properties.capsuleCount

> `readonly` **capsuleCount**: `object`

Number of capsules in the manifest the gate read.

#### properties.capsuleCount.type

> `readonly` **type**: `"number"` = `'number'`

#### properties.errors

> `readonly` **errors**: `object`

Human work-list: each blocking reason (missing/stale/dishonest/red). Empty on `ok`.

#### properties.errors.items

> `readonly` **items**: `object`

#### properties.errors.items.type

> `readonly` **type**: `"string"` = `'string'`

#### properties.errors.type

> `readonly` **type**: `"array"` = `'array'`

#### properties.status

> `readonly` **status**: `object`

#### properties.status.enum

> `readonly` **enum**: readonly \[`"ok"`, `"stale"`, `"failed"`\]

### required

> `readonly` **required**: readonly \[`"status"`, `"errors"`, `"capsuleCount"`, `"benches"`\]

### type

> `readonly` **type**: `"object"` = `'object'`

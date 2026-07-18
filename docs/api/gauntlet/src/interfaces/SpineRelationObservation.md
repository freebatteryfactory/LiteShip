[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SpineRelationObservation

# Interface: SpineRelationObservation

Defined in: [gauntlet/src/spine-relation-facts.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L73)

One observed mirror→runtime relation — the flat, already-classified outcome of
probing ONE admitted type's bidirectional assignability, plus everything the gate
needs to write a self-explaining Finding. A `resolved` observation whose
`observedRelation` satisfies its `admittedRelation` is conformant (no finding); a
mismatch is the drift the gate reports; an UNRESOLVED observation (an import that
did not typecheck-resolve — a renamed/removed mirror or runtime type) is a
structural drift the gate always reports.

## Properties

### admittedRelation

> `readonly` **admittedRelation**: [`SurfaceRelation`](../type-aliases/SurfaceRelation.md)

Defined in: [gauntlet/src/spine-relation-facts.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L79)

Axis 2, DECLARED — the frozen relation this type is admitted to hold (the seed).

***

### assignableRuntimeToSpine

> `readonly` **assignableRuntimeToSpine**: `boolean`

Defined in: [gauntlet/src/spine-relation-facts.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L85)

Did the RUNTIME type prove assignable to the SPINE type? (the `_r2s` probe).

***

### assignableSpineToRuntime

> `readonly` **assignableSpineToRuntime**: `boolean`

Defined in: [gauntlet/src/spine-relation-facts.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L83)

Did the SPINE type prove assignable to the RUNTIME type? (the `_s2r` probe).

***

### authority

> `readonly` **authority**: [`SpineAuthority`](../type-aliases/SpineAuthority.md)

Defined in: [gauntlet/src/spine-relation-facts.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L77)

Axis 1 — who owns the type (recorded for the two-axis report + convergence evidence).

***

### detail?

> `readonly` `optional` **detail?**: `string`

Defined in: [gauntlet/src/spine-relation-facts.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L89)

Optional witness/context — e.g. a resolution error, when `resolved` is false.

***

### observedRelation

> `readonly` **observedRelation**: [`SurfaceRelation`](../type-aliases/SurfaceRelation.md)

Defined in: [gauntlet/src/spine-relation-facts.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L81)

Axis 2, OBSERVED — the relation the assignability probe actually measured.

***

### resolved

> `readonly` **resolved**: `boolean`

Defined in: [gauntlet/src/spine-relation-facts.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L87)

Did BOTH sides import + typecheck-resolve? A false here is a hard structural drift.

***

### typeName

> `readonly` **typeName**: `string`

Defined in: [gauntlet/src/spine-relation-facts.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L75)

The mirror type being classified (e.g. `CompositeState`, `Codec.Shape`, `Millis`).

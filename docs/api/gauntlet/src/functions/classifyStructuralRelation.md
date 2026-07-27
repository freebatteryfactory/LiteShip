[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / classifyStructuralRelation

# Function: classifyStructuralRelation()

> **classifyStructuralRelation**(`assignableSpineToRuntime`, `assignableRuntimeToSpine`): [`SurfaceRelation`](../type-aliases/SurfaceRelation.md)

Defined in: [gauntlet/src/facts/spine-relation-facts.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/spine-relation-facts.ts#L114)

Classify the STRUCTURAL relation from the two assignability directions — a total
function over the 2×2 truth table:
 - `(true, true)`  → `exact` — bidirectional structural identity.
 - `(true, false)` → `public-narrower` — the spine is a SUBTYPE (a narrower public
   contract than the runtime).
 - `(false, true)` → `public-wider` — the spine is a SUPERTYPE (a wider public port
   than the runtime, e.g. `Codec.schema: SchemaPort` over the runtime `Schema`).
 - `(false, false)` → `opaque` — structurally incompatible in both directions.

## Parameters

### assignableSpineToRuntime

`boolean`

### assignableRuntimeToSpine

`boolean`

## Returns

[`SurfaceRelation`](../type-aliases/SurfaceRelation.md)

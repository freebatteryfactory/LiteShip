[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / relationSatisfied

# Function: relationSatisfied()

> **relationSatisfied**(`observed`, `admitted`): `boolean`

Defined in: [gauntlet/src/spine-relation-facts.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/spine-relation-facts.ts#L137)

Whether an OBSERVED structural relation satisfies the ADMITTED relation — the
two-axis conformance check the gate folds on.
 - `brand-reanchored` (Authority-spine): the runtime re-exports the brand FROM the
   spine (ADR-0010), so the two are structurally IDENTICAL — the probe observes
   `exact`. A reanchored brand that stopped being identical (a runtime
   redeclaration that changed the brand) observes non-`exact` → not satisfied.
 - `runtime-exists` / `intentionally-omitted`: NOT structurally probed here (value
   existence stays with the runtime-existence describes; deliberate omission is the
   type-export enumerator's plane) — a defensive `false` if one ever reaches the
   structural fold, so it can never be silently laundered green.
 - the four structural arms: satisfied iff the observed relation is identical.

## Parameters

### observed

[`SurfaceRelation`](../type-aliases/SurfaceRelation.md)

### admitted

[`SurfaceRelation`](../type-aliases/SurfaceRelation.md)

## Returns

`boolean`

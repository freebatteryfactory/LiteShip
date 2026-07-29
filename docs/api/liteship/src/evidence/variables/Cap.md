[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / Cap

# Variable: Cap

> `const` **Cap**: `object`

Defined in: core/dist/evidence/caps.d.ts:54

Cap — algebra over [CapSet](../interfaces/CapSet.md).
Pure, immutable helpers for building, combining, and comparing capability
sets; the underlying `CapTier` lattice is totally ordered via [Cap.ordinal](#ordinal).

## Type Declaration

### atLeast

> **atLeast**: *typeof* `_atLeast`

Whether `a` ranks `>=` `b` on the underlying ordered ladder.

### empty

> **empty**: *typeof* `_empty`

The empty [CapSet](../interfaces/CapSet.md).

### from

> **from**: *typeof* `_from`

Build a [CapSet](../interfaces/CapSet.md) from an array of [CapTier](../type-aliases/CapTier.md)s.

### grant

> **grant**: *typeof* `_grant`

Return a new [CapSet](../interfaces/CapSet.md) with the given level added.

### has

> **has**: *typeof* `_has`

Whether a [CapSet](../interfaces/CapSet.md) contains the given level.

### intersection

> **intersection**: *typeof* `_intersection`

Set intersection of two [CapSet](../interfaces/CapSet.md)s.

### ordinal

> **ordinal**: *typeof* `_ordinal`

Integer ordinal for a [CapTier](../type-aliases/CapTier.md) — useful for sorting / comparison.

### revoke

> **revoke**: *typeof* `_revoke`

Return a new [CapSet](../interfaces/CapSet.md) with the given level removed.

### superset

> **superset**: *typeof* `_superset`

Whether `a` contains every level of `b` (i.e. `a ⊇ b`).

### union

> **union**: *typeof* `_union`

Set union of two [CapSet](../interfaces/CapSet.md)s.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Cap

# Variable: Cap

> `const` **Cap**: `object`

Defined in: [core/src/caps.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/caps.ts#L80)

Cap — algebra over [CapSet](../interfaces/CapSet.md).
Pure, immutable helpers for building, combining, and comparing capability
sets; the underlying `CapTier` lattice is totally ordered via [Cap.ordinal](#ordinal).

## Type Declaration

### atLeast

> **atLeast**: (`a`, `b`) => `boolean` = `_atLeast`

Whether `a` ranks `>=` `b` on the underlying ordered ladder.

#### Parameters

##### a

[`CapTier`](../type-aliases/CapTier.md)

##### b

[`CapTier`](../type-aliases/CapTier.md)

#### Returns

`boolean`

### empty

> **empty**: () => [`CapSet`](../interfaces/CapSet.md) = `_empty`

The empty [CapSet](../interfaces/CapSet.md).

#### Returns

[`CapSet`](../interfaces/CapSet.md)

### from

> **from**: (`levels`) => [`CapSet`](../interfaces/CapSet.md) = `_from`

Build a [CapSet](../interfaces/CapSet.md) from an array of [CapTier](../type-aliases/CapTier.md)s.

#### Parameters

##### levels

readonly [`CapTier`](../type-aliases/CapTier.md)[]

#### Returns

[`CapSet`](../interfaces/CapSet.md)

### grant

> **grant**: (`caps`, `level`) => [`CapSet`](../interfaces/CapSet.md) = `_grant`

Return a new [CapSet](../interfaces/CapSet.md) with the given level added.

#### Parameters

##### caps

[`CapSet`](../interfaces/CapSet.md)

##### level

[`CapTier`](../type-aliases/CapTier.md)

#### Returns

[`CapSet`](../interfaces/CapSet.md)

### has

> **has**: (`caps`, `level`) => `boolean` = `_has`

Whether a [CapSet](../interfaces/CapSet.md) contains the given level.

#### Parameters

##### caps

[`CapSet`](../interfaces/CapSet.md)

##### level

[`CapTier`](../type-aliases/CapTier.md)

#### Returns

`boolean`

### intersection

> **intersection**: (`a`, `b`) => [`CapSet`](../interfaces/CapSet.md) = `_intersection`

Set intersection of two [CapSet](../interfaces/CapSet.md)s.

#### Parameters

##### a

[`CapSet`](../interfaces/CapSet.md)

##### b

[`CapSet`](../interfaces/CapSet.md)

#### Returns

[`CapSet`](../interfaces/CapSet.md)

### ordinal

> **ordinal**: (`level`) => `number` = `_ordinal`

Integer ordinal for a [CapTier](../type-aliases/CapTier.md) — useful for sorting / comparison.

#### Parameters

##### level

[`CapTier`](../type-aliases/CapTier.md)

#### Returns

`number`

### revoke

> **revoke**: (`caps`, `level`) => [`CapSet`](../interfaces/CapSet.md) = `_revoke`

Return a new [CapSet](../interfaces/CapSet.md) with the given level removed.

#### Parameters

##### caps

[`CapSet`](../interfaces/CapSet.md)

##### level

[`CapTier`](../type-aliases/CapTier.md)

#### Returns

[`CapSet`](../interfaces/CapSet.md)

### superset

> **superset**: (`a`, `b`) => `boolean` = `_superset`

Whether `a` contains every level of `b` (i.e. `a ⊇ b`).

#### Parameters

##### a

[`CapSet`](../interfaces/CapSet.md)

##### b

[`CapSet`](../interfaces/CapSet.md)

#### Returns

`boolean`

### union

> **union**: (`a`, `b`) => [`CapSet`](../interfaces/CapSet.md) = `_union`

Set union of two [CapSet](../interfaces/CapSet.md)s.

#### Parameters

##### a

[`CapSet`](../interfaces/CapSet.md)

##### b

[`CapSet`](../interfaces/CapSet.md)

#### Returns

[`CapSet`](../interfaces/CapSet.md)

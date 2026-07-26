[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineCapsuleCatalog

# Function: defineCapsuleCatalog()

> **defineCapsuleCatalog**(`capsules`): [`CapsuleCatalog`](../type-aliases/CapsuleCatalog.md)

Defined in: [core/src/authoring/assembly.ts:272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/assembly.ts#L272)

Compose capsule declarations explicitly. The returned catalog is sorted by
name then id, so import/discovery order cannot affect generated projections.
Duplicate names or identities are refused rather than silently shadowed.

## Parameters

### capsules

[`CapsuleCatalog`](../type-aliases/CapsuleCatalog.md)

## Returns

[`CapsuleCatalog`](../type-aliases/CapsuleCatalog.md)

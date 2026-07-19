[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / sortSurfaceElements

# Function: sortSurfaceElements()

> **sortSurfaceElements**(`elements`): readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

Defined in: [gauntlet/src/facts/standards-facts.ts:290](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L290)

Sort a list of surface elements into the CANONICAL order (by their stable key),
returning a NEW array. The host serializes this order so the committed snapshot
is byte-reproducible and diffs are minimal + reviewable.

## Parameters

### elements

readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

## Returns

readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

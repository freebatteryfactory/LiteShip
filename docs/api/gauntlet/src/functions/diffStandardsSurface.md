[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / diffStandardsSurface

# Function: diffStandardsSurface()

> **diffStandardsSurface**(`prior`, `current`): readonly [`StandardsChange`](../interfaces/StandardsChange.md)[]

Defined in: [gauntlet/src/standards-facts.ts:670](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L670)

The PURE weakening diff — classify every change between the committed snapshot's
elements and the live surface's elements. Order-independent (keyed by
[surfaceElementKey](surfaceElementKey.md)). Returns the changes sorted by key.

This is the core of the backstop: it has NO clock, NO I/O, NO content-address (the
host supplies the addresses). The host runs this, then partitions the weakenings
by the owner sign-offs (`applyStandardsWaivers`).

## Parameters

### prior

readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

### current

readonly [`StandardsElement`](../type-aliases/StandardsElement.md)[]

## Returns

readonly [`StandardsChange`](../interfaces/StandardsChange.md)[]

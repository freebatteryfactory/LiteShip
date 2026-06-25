[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FloorSurface

# Interface: FloorSurface

Defined in: [gauntlet/src/standards-facts.ts:154](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L154)

One committed numeric FLOOR (a mutation-score baseline entry, a complexity
ceiling, the zero-advisory floor, a coverage floor). The [direction](#direction)
declares which way is weakening, so the diff is direction-aware.

## Properties

### \_tag

> `readonly` **\_tag**: `"floor"`

Defined in: [gauntlet/src/standards-facts.ts:155](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L155)

***

### direction

> `readonly` **direction**: [`FloorDirection`](../type-aliases/FloorDirection.md)

Defined in: [gauntlet/src/standards-facts.ts:161](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L161)

Which way is STRONGER — so the diff knows which way is weakening.

***

### name

> `readonly` **name**: `string`

Defined in: [gauntlet/src/standards-facts.ts:157](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L157)

A stable name identifying this floor (e.g. `mutation-score::packages/canonical/src/fnv.ts`).

***

### value

> `readonly` **value**: `number`

Defined in: [gauntlet/src/standards-facts.ts:159](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L159)

The committed value.

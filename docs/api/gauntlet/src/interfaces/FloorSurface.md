[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FloorSurface

# Interface: FloorSurface

Defined in: [gauntlet/src/facts/standards-facts.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L172)

One committed numeric FLOOR (a mutation-score baseline entry, a complexity
ceiling, the zero-advisory floor, a coverage floor). The [direction](#direction)
declares which way is weakening, so the diff is direction-aware.

## Properties

### \_tag

> `readonly` **\_tag**: `"floor"`

Defined in: [gauntlet/src/facts/standards-facts.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L173)

***

### direction

> `readonly` **direction**: [`FloorDirection`](../type-aliases/FloorDirection.md)

Defined in: [gauntlet/src/facts/standards-facts.ts:179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L179)

Which way is STRONGER — so the diff knows which way is weakening.

***

### name

> `readonly` **name**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L175)

A stable name identifying this floor (e.g. `mutation-score::packages/canonical/src/fnv.ts`).

***

### value

> `readonly` **value**: `number`

Defined in: [gauntlet/src/facts/standards-facts.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L177)

The committed value.

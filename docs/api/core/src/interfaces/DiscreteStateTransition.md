[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / DiscreteStateTransition

# Interface: DiscreteStateTransition

Defined in: [core/src/motion/state-transition.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L50)

A typed authority record for a single discrete state crossing. The
next-state VALUE lives in `next`/`generation` (minted by the authority), never
inferred from a graph node's content-address. `base`/`resultId` carry the
graph identity the crossing occurred against (and the recast result, when the
crossing recast the graph), so a composed chain can filter to the adopted
branch. `kind: 'discrete'` is the literal that makes the replay input
unrepresentable for continuous transients (Law 16).

## Properties

### \_tag

> `readonly` **\_tag**: `"DiscreteStateTransition"`

Defined in: [core/src/motion/state-transition.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L51)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/motion/state-transition.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L52)

***

### authority

> `readonly` **authority**: [`StateAuthority`](../type-aliases/StateAuthority.md)

Defined in: [core/src/motion/state-transition.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L62)

Reuse the existing authority union.

***

### base

> `readonly` **base**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/motion/state-transition.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L64)

Graph identity the crossing occurred against.

***

### cell

> `readonly` **cell**: `string`

Defined in: [core/src/motion/state-transition.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L54)

StateCellStore authority key (the cell name).

***

### generation

> `readonly` **generation**: `number`

Defined in: [core/src/motion/state-transition.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L60)

Monotonic per-cell generation ([StateCell.generation](StateCell.md#generation)).

***

### kind

> `readonly` **kind**: `"discrete"`

Defined in: [core/src/motion/state-transition.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L68)

Literal — the uncompilable-seam anchor.

***

### next

> `readonly` **next**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/state-transition.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L58)

Value-bearing next state — the crossing target.

***

### previous?

> `readonly` `optional` **previous?**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/motion/state-transition.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L56)

Prior state when known (undefined at genesis).

***

### resultId?

> `readonly` `optional` **resultId?**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/motion/state-transition.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L66)

Graph id after recast, when the crossing recast the graph.

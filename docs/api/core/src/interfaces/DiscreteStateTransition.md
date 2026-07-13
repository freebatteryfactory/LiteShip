[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DiscreteStateTransition

# Interface: DiscreteStateTransition

Defined in: [core/src/state-transition.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L43)

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

Defined in: [core/src/state-transition.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L44)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/state-transition.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L45)

***

### authority

> `readonly` **authority**: [`StateAuthority`](../type-aliases/StateAuthority.md)

Defined in: [core/src/state-transition.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L55)

Reuse the existing authority union.

***

### base

> `readonly` **base**: `ContentAddress`

Defined in: [core/src/state-transition.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L57)

Graph identity the crossing occurred against.

***

### cell

> `readonly` **cell**: `string`

Defined in: [core/src/state-transition.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L47)

StateCellStore authority key (the cell name).

***

### generation

> `readonly` **generation**: `number`

Defined in: [core/src/state-transition.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L53)

Monotonic per-cell generation ([StateCell.generation](StateCell.md#generation)).

***

### kind

> `readonly` **kind**: `"discrete"`

Defined in: [core/src/state-transition.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L61)

Literal — the uncompilable-seam anchor.

***

### next

> `readonly` **next**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/state-transition.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L51)

Value-bearing next state — the crossing target.

***

### previous?

> `readonly` `optional` **previous?**: [`StateName`](../type-aliases/StateName.md)

Defined in: [core/src/state-transition.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L49)

Prior state when known (undefined at genesis).

***

### resultId?

> `readonly` `optional` **resultId?**: `ContentAddress`

Defined in: [core/src/state-transition.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L59)

Graph id after recast, when the crossing recast the graph.

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / DiscreteStateTransition

# Interface: DiscreteStateTransition

Defined in: core/dist/motion/state-transition.d.ts:38

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

Defined in: core/dist/motion/state-transition.d.ts:39

***

### \_version

> `readonly` **\_version**: `1`

Defined in: core/dist/motion/state-transition.d.ts:40

***

### authority

> `readonly` **authority**: [`StateAuthority`](../../reactive/type-aliases/StateAuthority.md)

Defined in: core/dist/motion/state-transition.d.ts:50

Reuse the existing authority union.

***

### base

> `readonly` **base**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/motion/state-transition.d.ts:52

Graph identity the crossing occurred against.

***

### cell

> `readonly` **cell**: `string`

Defined in: core/dist/motion/state-transition.d.ts:42

StateCellStore authority key (the cell name).

***

### generation

> `readonly` **generation**: `number`

Defined in: core/dist/motion/state-transition.d.ts:48

Monotonic per-cell generation ([StateCell.generation](../../reactive/interfaces/StateCell.md#generation)).

***

### kind

> `readonly` **kind**: `"discrete"`

Defined in: core/dist/motion/state-transition.d.ts:56

Literal — the uncompilable-seam anchor.

***

### next

> `readonly` **next**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/state-transition.d.ts:46

Value-bearing next state — the crossing target.

***

### previous?

> `readonly` `optional` **previous?**: [`StateName`](../../schema/type-aliases/StateName.md)

Defined in: core/dist/motion/state-transition.d.ts:44

Prior state when known (undefined at genesis).

***

### resultId?

> `readonly` `optional` **resultId?**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/motion/state-transition.d.ts:54

Graph id after recast, when the crossing recast the graph.

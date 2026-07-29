[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / ProjectionState

# Interface: ProjectionState\<S\>

Defined in: core/dist/reactive/state-cell.d.ts:42

Per-projection typed authority aggregate consumed by emitters.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### \_tag

> `readonly` **\_tag**: `"ProjectionState"`

Defined in: core/dist/reactive/state-cell.d.ts:43

***

### cells

> `readonly` **cells**: `Readonly`\<`Record`\<`string`, [`StateCell`](StateCell.md)\<`S`\>\>\>

Defined in: core/dist/reactive/state-cell.d.ts:45

***

### dirtyEpoch

> `readonly` **dirtyEpoch**: `number`

Defined in: core/dist/reactive/state-cell.d.ts:47

Composite dirty epoch — max of constituent cells.

***

### projection

> `readonly` **projection**: `string`

Defined in: core/dist/reactive/state-cell.d.ts:44

***

### resolution?

> `readonly` `optional` **resolution?**: [`StateResolutionReceipt`](StateResolutionReceipt.md)

Defined in: core/dist/reactive/state-cell.d.ts:50

***

### resolvedState

> `readonly` **resolvedState**: [`StateName`](../../schema/type-aliases/StateName.md)\<`S`\>

Defined in: core/dist/reactive/state-cell.d.ts:49

Primary discrete state for `data-liteship-state` / CSS state selectors.

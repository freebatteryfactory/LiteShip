[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionState

# Interface: ProjectionState\<S\>

Defined in: [core/src/state-cell.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L50)

Per-projection typed authority aggregate consumed by emitters.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### \_tag

> `readonly` **\_tag**: `"ProjectionState"`

Defined in: [core/src/state-cell.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L51)

***

### cells

> `readonly` **cells**: `Readonly`\<`Record`\<`string`, [`StateCell`](StateCell.md)\<`S`\>\>\>

Defined in: [core/src/state-cell.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L53)

***

### dirtyEpoch

> `readonly` **dirtyEpoch**: `number`

Defined in: [core/src/state-cell.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L55)

Composite dirty epoch — max of constituent cells.

***

### projection

> `readonly` **projection**: `string`

Defined in: [core/src/state-cell.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L52)

***

### resolution?

> `readonly` `optional` **resolution?**: [`StateResolutionReceipt`](StateResolutionReceipt.md)

Defined in: [core/src/state-cell.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L58)

***

### resolvedState

> `readonly` **resolvedState**: [`StateName`](../type-aliases/StateName.md)\<`S`\>

Defined in: [core/src/state-cell.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L57)

Primary discrete state for `data-czap-state` / CSS state selectors.

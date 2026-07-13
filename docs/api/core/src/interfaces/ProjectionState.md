[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionState

# Interface: ProjectionState\<S\>

Defined in: [core/src/state-cell.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L51)

Per-projection typed authority aggregate consumed by emitters.

## Type Parameters

### S

`S` *extends* `string` = `string`

## Properties

### \_tag

> `readonly` **\_tag**: `"ProjectionState"`

Defined in: [core/src/state-cell.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L52)

***

### cells

> `readonly` **cells**: `Readonly`\<`Record`\<`string`, [`StateCell`](StateCell.md)\<`S`\>\>\>

Defined in: [core/src/state-cell.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L54)

***

### dirtyEpoch

> `readonly` **dirtyEpoch**: `number`

Defined in: [core/src/state-cell.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L56)

Composite dirty epoch — max of constituent cells.

***

### projection

> `readonly` **projection**: `string`

Defined in: [core/src/state-cell.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L53)

***

### resolution?

> `readonly` `optional` **resolution?**: [`StateResolutionReceipt`](StateResolutionReceipt.md)

Defined in: [core/src/state-cell.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L59)

***

### resolvedState

> `readonly` **resolvedState**: [`StateName`](../type-aliases/StateName.md)\<`S`\>

Defined in: [core/src/state-cell.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L58)

Primary discrete state for `data-czap-state` / CSS state selectors.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProjectionState

# Variable: ProjectionState

> **ProjectionState**: `object`

Defined in: [core/src/state-cell.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-cell.ts#L50)

ProjectionState — per-projection typed authority aggregate.

## Type Declaration

### fromCells()

> **fromCells**(`projection`, `cells`, `resolution?`): [`ProjectionState`](../interfaces/ProjectionState.md)

Build from an explicit cell map.

#### Parameters

##### projection

`string`

##### cells

`Readonly`\<`Record`\<`string`, [`StateCell`](../interfaces/StateCell.md)\>\>

##### resolution?

[`StateResolutionReceipt`](../interfaces/StateResolutionReceipt.md)

#### Returns

[`ProjectionState`](../interfaces/ProjectionState.md)

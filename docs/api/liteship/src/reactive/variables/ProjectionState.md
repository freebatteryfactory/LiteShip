[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / ProjectionState

# Variable: ProjectionState

> **ProjectionState**: `object`

Defined in: core/dist/reactive/state-cell.d.ts:42

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

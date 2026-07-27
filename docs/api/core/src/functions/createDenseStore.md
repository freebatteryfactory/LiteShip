[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createDenseStore

# Function: createDenseStore()

> **createDenseStore**(`name`, `capacity`): [`DenseStore`](../interfaces/DenseStore.md)

Defined in: [core/src/ecs.ts:347](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L347)

Allocate a fixed-capacity dense numeric component store. The standalone
`create*` verb makes allocation explicit while preserving the same
`Float64Array`-backed zero-allocation hot path.

## Parameters

### name

`string`

### capacity

`number`

## Returns

[`DenseStore`](../interfaces/DenseStore.md)

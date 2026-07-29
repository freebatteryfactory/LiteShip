[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / RuntimeCoordinator

# Variable: RuntimeCoordinator

> **RuntimeCoordinator**: `object`

Defined in: [core/src/reactive/runtime-coordinator.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/runtime-coordinator.ts#L37)

Runtime coordinator namespace — single entry point for building the shared
`Plan` + ECS store bundle consumed by every host adapter.

## Type Declaration

### create

> `readonly` **create**: (`config?`) => [`RuntimeCoordinator`](../interfaces/RuntimeCoordinator.md) = `createRuntimeCoordinator`

Create a fresh coordinator. See `createRuntimeCoordinator`.

Build a fresh RuntimeCoordinator with dense backing stores and the
canonical runtime plan. Prefer [RuntimeCoordinator.create](#create), which is
the exported entry point.

#### Parameters

##### config?

[`RuntimeCoordinatorConfig`](../interfaces/RuntimeCoordinatorConfig.md)

#### Returns

[`RuntimeCoordinator`](../interfaces/RuntimeCoordinator.md)

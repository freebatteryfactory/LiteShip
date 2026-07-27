[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / RuntimeCoordinator

# Variable: RuntimeCoordinator

> **RuntimeCoordinator**: `object`

Defined in: core/dist/reactive/runtime-coordinator.d.ts:32

Runtime coordinator namespace — single entry point for building the shared
`Plan` + ECS store bundle consumed by every host adapter.

## Type Declaration

### create

> `readonly` **create**: (`config?`) => [`RuntimeCoordinator`](../interfaces/RuntimeCoordinator.md)

Create a fresh coordinator. See `createRuntimeCoordinator`.

Build a fresh RuntimeCoordinator with dense backing stores and the
canonical runtime plan. Prefer [RuntimeCoordinator.create](#create), which is
the exported entry point.

#### Parameters

##### config?

[`RuntimeCoordinatorConfig`](../interfaces/RuntimeCoordinatorConfig.md)

#### Returns

[`RuntimeCoordinator`](../interfaces/RuntimeCoordinator.md)

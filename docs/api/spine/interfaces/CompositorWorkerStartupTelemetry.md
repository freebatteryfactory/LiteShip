[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / CompositorWorkerStartupTelemetry

# Interface: CompositorWorkerStartupTelemetry

Defined in: [\_spine/worker.d.ts:343](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L343)

Per-stage timing and path evidence from compositor-worker startup.

## Methods

### onResolvedStateSettled()?

> `optional` **onResolvedStateSettled**(`states`): `void`

Defined in: [\_spine/worker.d.ts:346](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L346)

Fired when the worker acknowledges the resolved-state bootstrap.

#### Parameters

##### states

readonly [`ResolvedStateEntry`](ResolvedStateEntry.md)[]

#### Returns

`void`

***

### recordStage()

> **recordStage**(`stage`, `durationNs`): `void`

Defined in: [\_spine/worker.d.ts:344](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L344)

#### Parameters

##### stage

[`CompositorWorkerStartupStage`](../type-aliases/CompositorWorkerStartupStage.md)

##### durationNs

`number`

#### Returns

`void`

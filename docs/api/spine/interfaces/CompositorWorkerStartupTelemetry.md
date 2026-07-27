[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CompositorWorkerStartupTelemetry

# Interface: CompositorWorkerStartupTelemetry

Defined in: [\_spine/worker.d.ts:342](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L342)

Per-stage timing and path evidence from compositor-worker startup.

## Methods

### onResolvedStateSettled()?

> `optional` **onResolvedStateSettled**(`states`): `void`

Defined in: [\_spine/worker.d.ts:345](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L345)

Fired when the worker acknowledges the resolved-state bootstrap.

#### Parameters

##### states

readonly [`ResolvedStateEntry`](ResolvedStateEntry.md)[]

#### Returns

`void`

***

### recordStage()

> **recordStage**(`stage`, `durationNs`): `void`

Defined in: [\_spine/worker.d.ts:343](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L343)

#### Parameters

##### stage

[`CompositorWorkerStartupStage`](../type-aliases/CompositorWorkerStartupStage.md)

##### durationNs

`number`

#### Returns

`void`

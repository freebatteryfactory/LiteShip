[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / WorkerMetrics

# Type Alias: WorkerMetrics

> **WorkerMetrics** = `MetricsMessage`

Defined in: [worker/src/compositor-types.ts:22](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L22)

The performance sample delivered to [CompositorWorkerShape.onMetrics](../interfaces/CompositorWorkerShape.md#onmetrics)
listeners — a single record (reusing the wire MetricsMessage
shape) rather than positional `(fps, budgetUsed)` arguments, so a future
metric can be added without changing the callback's arity.

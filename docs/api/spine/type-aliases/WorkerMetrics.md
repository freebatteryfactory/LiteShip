[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / WorkerMetrics

# Type Alias: WorkerMetrics

> **WorkerMetrics** = [`MetricsMessage`](../interfaces/MetricsMessage.md)

Defined in: [\_spine/worker.d.ts:263](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L263)

The performance sample delivered to `CompositorWorker.onMetrics`
listeners — a single record reusing the wire [MetricsMessage](../interfaces/MetricsMessage.md) shape
(not positional `(fps, budgetUsed)` arguments), so a future metric can be
added without changing the callback's arity (F1).

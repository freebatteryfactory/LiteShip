[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / CompositorWorkerState

# Type Alias: CompositorWorkerState

> **CompositorWorkerState** = [`CompositeState`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/compositor-pool.ts) & `object`

Defined in: [worker/src/compositor-types.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/compositor-types.ts#L33)

A `CompositeState` snapshot emitted by the compositor worker, optionally
annotated with per-quantizer generation counters. The generation map
enables receivers to drop stale out-of-order messages.

## Type Declaration

### resolvedStateGenerations?

> `readonly` `optional` **resolvedStateGenerations?**: `Record`\<`string`, `number`\>

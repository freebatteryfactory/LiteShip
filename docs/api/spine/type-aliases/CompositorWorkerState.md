[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / CompositorWorkerState

# Type Alias: CompositorWorkerState

> **CompositorWorkerState** = [`CompositeState`](../interfaces/CompositeState.md) & `object`

Defined in: [\_spine/worker.d.ts:354](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/worker.d.ts#L354)

A `CompositeState` snapshot emitted by the compositor worker, optionally
annotated with per-quantizer generation counters so receivers can drop
stale out-of-order messages.

## Type Declaration

### resolvedStateGenerations?

> `readonly` `optional` **resolvedStateGenerations?**: `Record`\<`string`, `number`\>

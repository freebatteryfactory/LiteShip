[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CompositorStatePool

# Type Alias: CompositorStatePool

> **CompositorStatePool** = `CompositorStatePoolShape`

Defined in: [core/src/media/compositor-pool.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/compositor-pool.ts#L162)

Public structural type for `CompositorStatePool` -- ring buffer of pre-allocated
CompositeState objects. Zero-allocation hot path: acquire a state, write into it,
render, then release. Construct one with the standalone
[createCompositorStatePool](../functions/createCompositorStatePool.md) (verb grammar, ADR-0046).

## Example

```ts
const pool = createCompositorStatePool(8);
const state = pool.acquire();
// Write compositor output into state.discrete, state.blend, state.outputs
pool.release(state); // resets and returns to pool
console.log(pool.size, pool.available); // 8, 8
```

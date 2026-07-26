[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / CompositorStatePool

# Type Alias: CompositorStatePool

> **CompositorStatePool** = `CompositorStatePoolShape`

Defined in: core/dist/media/compositor-pool.d.ts:69

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

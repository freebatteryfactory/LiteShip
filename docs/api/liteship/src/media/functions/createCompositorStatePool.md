[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / createCompositorStatePool

# Function: createCompositorStatePool()

> **createCompositorStatePool**(`capacity?`): `CompositorStatePoolShape`

Defined in: core/dist/media/compositor-pool.d.ts:53

Creates a ring-buffer pool of pre-allocated CompositeState objects.
Acquire/release pattern avoids GC allocations on the hot render path.
Default 8 slots -- enough for typical compositor with 4-6 quantizers + headroom.

## Parameters

### capacity?

`number`

## Returns

`CompositorStatePoolShape`

## Example

```ts
const pool = createCompositorStatePool(4);
const state = pool.acquire();
state.discrete['theme'] = 'dark';
state.outputs.css['--bg'] = '#000';
pool.release(state); // resets and returns to pool
pool.available; // 4
```

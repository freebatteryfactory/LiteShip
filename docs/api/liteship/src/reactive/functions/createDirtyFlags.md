[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / createDirtyFlags

# Function: createDirtyFlags()

> **createDirtyFlags**\<`K`\>(`keys`): [`DirtyFlags`](../type-aliases/DirtyFlags.md)\<`K`\>

Defined in: core/dist/reactive/dirty.d.ts:33

Creates a bitmask-based dirty tracker for the given keys (max 31).
Enables O(1) mark, clear, and check operations for change tracking.

## Type Parameters

### K

`K` *extends* `string`

## Parameters

### keys

readonly `K`[]

## Returns

[`DirtyFlags`](../type-aliases/DirtyFlags.md)\<`K`\>

## Example

```ts
const flags = createDirtyFlags(['position', 'color', 'opacity'] as const);
flags.mark('position');
flags.mark('color');
flags.isDirty('position'); // true
flags.isDirty('opacity');  // false
flags.getDirty();          // ['position', 'color']
flags.clearAll();
flags.mask;                // 0
```

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createDirtyFlags

# Function: createDirtyFlags()

> **createDirtyFlags**\<`K`\>(`keys`): `DirtyFlagsShape`\<`K`\>

Defined in: [core/src/reactive/dirty.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/dirty.ts#L38)

Creates a bitmask-based dirty tracker for the given keys (max 31).
Enables O(1) mark, clear, and check operations for change tracking.

## Type Parameters

### K

`K` *extends* `string`

## Parameters

### keys

readonly `K`[]

## Returns

`DirtyFlagsShape`\<`K`\>

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

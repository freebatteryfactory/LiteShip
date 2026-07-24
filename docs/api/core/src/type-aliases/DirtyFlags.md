[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / DirtyFlags

# Type Alias: DirtyFlags\<K\>

> **DirtyFlags**\<`K`\> = `DirtyFlagsShape`\<`K`\>

Defined in: [core/src/reactive/dirty.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/dirty.ts#L98)

Public structural type for `DirtyFlags` -- bitmask-based dirty tracking for up to
31 named keys. O(1) mark/clear/check operations using bitwise integer operations.
Construct one with the standalone [createDirtyFlags](../functions/createDirtyFlags.md) (verb grammar, ADR-0046).

## Type Parameters

### K

`K` *extends* `string` = `string`

## Example

```ts
const flags = createDirtyFlags(['transform', 'style'] as const);
flags.mark('transform');
flags.isDirty('transform'); // true
flags.clear('transform');
flags.isDirty('transform'); // false
```

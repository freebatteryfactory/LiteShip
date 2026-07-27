[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createBlendTree

# Function: createBlendTree()

> **createBlendTree**\<`T`\>(): `OwnedBlendTree`\<`T`\>

Defined in: [core/src/motion/blend.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/blend.ts#L57)

Creates a new BlendTree for weighted multi-state blending of numeric records.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `number`\>

## Returns

`OwnedBlendTree`\<`T`\>

## Example

```ts
const tree = createBlendTree<{ x: number; y: number }>();
tree.add('idle', { x: 0, y: 0 }, 0.3);
tree.add('active', { x: 100, y: 50 }, 0.7);
const blended = tree.compute(); // { x: 70, y: 35 }
await tree.dispose();
```

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / BlendTree

# Type Alias: BlendTree\<T\>

> **BlendTree**\<`T`\> = `BlendTreeShape`\<`T`\>

Defined in: [core/src/motion/blend.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/blend.ts#L147)

Public structural type for `BlendTree` -- weighted multi-state blending for
numeric records. Add named nodes with values and weights, then compute the
weighted average. Construct one with the standalone [createBlendTree](../functions/createBlendTree.md)
(verb grammar, ADR-0046), which returns the tree augmented with its own
`dispose()`.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `number`\>

## Example

```ts
const tree = createBlendTree<{ opacity: number }>();
tree.add('fadeIn', { opacity: 1 }, 0.8);
tree.add('fadeOut', { opacity: 0 }, 0.2);
const result = tree.compute(); // { opacity: 0.8 }
await tree.dispose();
```

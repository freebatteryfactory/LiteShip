[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / BlendTree

# Type Alias: BlendTree\<T\>

> **BlendTree**\<`T`\> = `BlendTreeShape`\<`T`\>

Defined in: core/dist/motion/blend.d.ts:67

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

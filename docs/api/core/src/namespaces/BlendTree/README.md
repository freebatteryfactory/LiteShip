[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / BlendTree

# BlendTree

BlendTree -- weighted multi-state blending for numeric records.
Add named nodes with values and weights, then compute the weighted average.
`make` returns a `{ tree, lifetime }` handle.

## Example

```ts
const { tree } = BlendTree.make<{ opacity: number }>();
tree.add('fadeIn', { opacity: 1 }, 0.8);
tree.add('fadeOut', { opacity: 0 }, 0.2);
const result = tree.compute(); // { opacity: 0.8 }
```

## Type Aliases

- [Handle](type-aliases/Handle.md)
- [Node](type-aliases/Node.md)
- [Shape](type-aliases/Shape.md)

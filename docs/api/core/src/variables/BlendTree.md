[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / BlendTree

# Variable: BlendTree

> `const` **BlendTree**: `object`

Defined in: [core/src/motion/blend.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/blend.ts#L144)

BlendTree -- weighted multi-state blending for numeric records.
Add named nodes with values and weights, then compute the weighted average.
`make` returns a `{ tree, lifetime }` handle.

## Type Declaration

### make

> **make**: \<`T`\>() => `BlendTreeHandle`\<`T`\> = `_make`

Creates a new BlendTree for weighted multi-state blending of numeric records.

#### Type Parameters

##### T

`T` *extends* `Record`\<`string`, `number`\>

#### Returns

`BlendTreeHandle`\<`T`\>

#### Example

```ts
const { tree } = BlendTree.make<{ x: number; y: number }>();
tree.add('idle', { x: 0, y: 0 }, 0.3);
tree.add('active', { x: 100, y: 50 }, 0.7);
const blended = tree.compute(); // { x: 70, y: 35 }
```

## Example

```ts
const { tree } = BlendTree.make<{ opacity: number }>();
tree.add('fadeIn', { opacity: 1 }, 0.8);
tree.add('fadeOut', { opacity: 0 }, 0.2);
const result = tree.compute(); // { opacity: 0.8 }
```

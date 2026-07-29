[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [liteship/src](../README.md) / defineStyle

# Function: defineStyle()

> **defineStyle**\<`B`\>(`config`): `StyleDef`\<`B`\>

Defined in: core/dist/authoring/style.d.ts:123

Define an adaptive style — binds a base style layer to optional boundary
states with per-state overrides and CSS transitions.

Validates that state keys match the boundary's states (if a boundary is
provided). The resulting object is frozen and content-addressed via FNV-1a.

## Type Parameters

### B

`B` *extends* [`Boundary`](../type-aliases/Boundary.md)

## Parameters

### config

#### base

`StyleLayer`

#### boundary?

`B`

#### states?

`{ readonly [S in string]?: StyleLayer }`

#### transition?

`TransitionConfig`

## Returns

`StyleDef`\<`B`\>

## Example

```ts
const style = defineStyle({
  base: { properties: { display: 'flex', gap: '8px' } },
});
// style._tag === 'StyleDef'
// style.id === 'fnv1a:...'
```

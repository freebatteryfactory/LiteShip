[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / cssVarsFromState

# Function: cssVarsFromState()

> **cssVarsFromState**(`state`): `Record`\<`string`, `string`\>

Defined in: [remotion/src/hooks.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/hooks.ts#L31)

Convert `CompositeState.outputs.css` into a flat CSS custom property map.

The returned record is suitable for use directly as a React `style` prop
or a Remotion `style` prop -- every key is a CSS variable name (e.g.
`--liteship-color-fg`) and every value is coerced to a string.

## Parameters

### state

[`CompositeState`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/compositor-pool.ts)

A composite state produced by a `VideoRenderer` frame.

## Returns

`Record`\<`string`, `string`\>

A flat `{ [cssVar]: string }` map.

## Example

```tsx
const vars = cssVarsFromState(state);
return <div style={vars}>...</div>;
```

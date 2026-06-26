[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / serializeBoundaryCss

# Function: serializeBoundaryCss()

> **serializeBoundaryCss**(`resolution`): `string`

Defined in: [astro/src/fetch-layer.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L82)

Serialize a resolution's compiled boundary outputs into one stylesheet, in
CSS-correct order: the theme `:root {}` custom properties first, then per
boundary the canonical compiled CSS payload. `CompiledOutputs.css` already
contains property registrations and container queries in the correct order;
the sibling fields are structured mirrors for consumers, not extra bytes to
prepend. Handles both the sole-boundary (`compiledOutputs`) and
multi-boundary (`boundaries`) resolution forms.

This is the edge-served form of the same outputs a page inlines; exposed and
tested directly so the edge-served render is not a hidden mirror.

## Parameters

### resolution

`EdgeHostResolution`

## Returns

`string`

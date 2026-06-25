[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / serializeBoundaryCss

# Function: serializeBoundaryCss()

> **serializeBoundaryCss**(`resolution`): `string`

Defined in: [astro/src/fetch-layer.ts:81](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L81)

Serialize a resolution's compiled boundary outputs into one stylesheet, in
CSS-correct order: the theme `:root {}` custom properties first, then per
boundary the `@property` registrations (must precede the rules that consume
them), the `@container` queries (carry their own containment), and finally the
boundary CSS. Handles both the sole-boundary (`compiledOutputs`) and
multi-boundary (`boundaries`) resolution forms.

This is the edge-served form of the same outputs a page inlines; exposed and
tested directly so the hot-path render is not a hidden mirror.

## Parameters

### resolution

`EdgeHostResolution`

## Returns

`string`

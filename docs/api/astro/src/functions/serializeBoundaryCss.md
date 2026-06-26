[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / serializeBoundaryCss

# Function: serializeBoundaryCss()

> **serializeBoundaryCss**(`resolution`): `string`

Defined in: [astro/src/fetch-layer.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/fetch-layer.ts#L83)

Serialize a resolution's compiled boundary outputs into one stylesheet, in
CSS-correct order: the theme `:root {}` custom properties first, then per
boundary property registrations, container queries, and the compiled CSS
payload. Vite-produced outputs already fold the first two sections into
`CompiledOutputs.css`; custom compile/KV outputs may keep them split, so the
serializer preserves split sections without duplicating folded ones. Handles
both the sole-boundary (`compiledOutputs`) and multi-boundary (`boundaries`)
resolution forms.

This is the edge-served form of the same outputs a page inlines; exposed and
tested directly so the edge-served render is not a hidden mirror.

## Parameters

### resolution

`EdgeHostResolution`

## Returns

`string`

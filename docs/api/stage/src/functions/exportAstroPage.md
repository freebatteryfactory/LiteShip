[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportAstroPage

# Function: exportAstroPage()

> **exportAstroPage**(`graph`): `ExportNode`

Defined in: [stage/src/dual-export.ts:155](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L155)

Cast the graph's css projections to a static Astro page string.

Walks each `css` ProjectionNode → its source ComponentNode →
`CSSCompiler.compile` (the existing compiler) for the `<style>` block, then
`resolveInitialState` + `satelliteAttrs` (the existing astro helpers) for the
satellite shell. The page bytes are content-addressed via
`AddressedDigest.of(CanonicalCbor.encode(...))` — the core kernel, never
JSON/cborg — and returned as a sealed `ExportNode{carrier:'astro-page'}`
whose `sourceRefs` are exactly the projection ids it consumed.

## Parameters

### graph

`DocumentGraph`

## Returns

`ExportNode`

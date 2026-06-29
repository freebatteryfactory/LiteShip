[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportAstroPage

# Function: exportAstroPage()

> **exportAstroPage**(`graph`): [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

Defined in: [stage/src/dual-export.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L173)

Cast the graph's css projections to a static Astro page string.

Walks each `css` [ProjectionNode](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts) → its source [ComponentNode](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts) →
`CSSCompiler.compile` (the existing compiler) for the `<style>` block, then
`resolveInitialState` + `satelliteAttrs` (the existing astro helpers) for the
satellite shell. The page bytes are content-addressed via
`AddressedDigest.of(CanonicalCbor.encode(...))` — the core kernel, never
JSON/cborg — and returned as a sealed `ExportNode{carrier:'astro-page'}`
whose `sourceRefs` are exactly the projection ids it consumed.

## Parameters

### graph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

## Returns

[`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

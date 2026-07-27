[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / exportAstroPage

# Function: exportAstroPage()

> **exportAstroPage**(`graph`): [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L158)

Cast the graph's css projections to a static Astro page string.

Walks each `css` [ProjectionNode](../../../liteship/src/graph/interfaces/ProjectionNode.md) → its source [ComponentNode](../../../liteship/src/graph/interfaces/ComponentNode.md) →
`CSSCompiler.compile` (the existing compiler) for the `<style>` block, then
`resolveInitialState` + `adaptiveAttrs` (the existing astro helpers) for the
adaptive shell. The page bytes are content-addressed via
`AddressedDigest.of(CanonicalCbor.encode(...))` — the core kernel, never
JSON/cborg — and returned as a sealed `ExportNode{carrier:'astro-page'}`
whose `sourceRefs` are exactly the projection ids it consumed.

## Parameters

### graph

[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)

## Returns

[`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

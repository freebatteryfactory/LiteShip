[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / CellKind

# Type Alias: CellKind

> **CellKind** = `"boundary"` \| `"state"` \| `"output"` \| `"signal"` \| `"transition"` \| `"timeline"` \| `"compositor"` \| `"blend"` \| `"css"` \| `"glsl"` \| `"wgsl"` \| `"aria"` \| `"ai"`

Defined in: core/dist/schema/protocol.d.ts:15

Discriminator tagging what a [CellEnvelope](../interfaces/CellEnvelope.md) carries — a boundary, a
discrete state, a target output (CSS/GLSL/WGSL/ARIA/AI), or one of the
other reactive shapes produced along the pipeline.

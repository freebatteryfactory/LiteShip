[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / NodeFamily

# Type Alias: NodeFamily

> **NodeFamily** = `"signal"` \| `"entity"` \| `"component"` \| `"pose"` \| `"transition"` \| `"projection"` \| `"policy"` \| `"export"`

Defined in: core/dist/graph/document-graph.d.ts:38

Node-family discriminator. Six families map onto the existing `CellKind`
vocabulary at the wire boundary; `policy` and `export` are the two net-new
families. `NodeFamily` is kept SEPARATE from `CellKind` (not merged into
`protocol.ts`) so existing `CellEnvelope` consumers need not learn families
nothing reads as a wire cell — "written data needs a reader".

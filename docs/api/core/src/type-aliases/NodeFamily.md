[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / NodeFamily

# Type Alias: NodeFamily

> **NodeFamily** = `"signal"` \| `"entity"` \| `"component"` \| `"pose"` \| `"transition"` \| `"projection"` \| `"policy"` \| `"export"`

Defined in: [core/src/graph/document-graph.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts#L41)

Node-family discriminator. Six families map onto the existing `CellKind`
vocabulary at the wire boundary; `policy` and `export` are the two net-new
families. `NodeFamily` is kept SEPARATE from `CellKind` (not merged into
`protocol.ts`) so existing `CellEnvelope` consumers need not learn families
nothing reads as a wire cell — "written data needs a reader".

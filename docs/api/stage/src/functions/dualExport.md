[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / dualExport

# Function: dualExport()

> **dualExport**(`graph`): `Promise`\<[`DualExportResult`](../interfaces/DualExportResult.md)\>

Defined in: [stage/src/dual-export.ts:520](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L520)

THE JEWEL. Cast one [DocumentGraph](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts) to a static Astro page AND a video,
then prove both derive from one source.

1. `sharedSourceDigest = graph.digest` — the graph's own integrity digest,
   minted by the keystone kernel over the canonical source bytes.
2. Run both EXISTING casters: [exportAstroPage](exportAstroPage.md) + [exportVideo](exportVideo.md).
   Both `ExportNode`s carry `sourceRefs` resolving into the same `graph.id`.
3. Mint a child receipt per cast, then a PARENT MERGE envelope whose
   `previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
   `sharedSourceDigest`. The merge envelope is the single assertable head.

## Parameters

### graph

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

## Returns

`Promise`\<[`DualExportResult`](../interfaces/DualExportResult.md)\>

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifest

# Type Alias: BoundaryManifest

> **BoundaryManifest** = `Readonly`\<`Record`\<`string`, [`BoundaryManifestEntry`](../interfaces/BoundaryManifestEntry.md)\>\>

Defined in: [edge/src/manifest.ts:189](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L189)

Build-derived boundary manifest: boundary export name to
[BoundaryManifestEntry](../interfaces/BoundaryManifestEntry.md). This is the value of the
`virtual:czap/boundaries` virtual module and the `boundaries` field of
the emitted `czap-boundary-manifest.json`.

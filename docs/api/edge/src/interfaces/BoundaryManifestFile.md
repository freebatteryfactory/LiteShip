[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestFile

# Interface: BoundaryManifestFile

Defined in: [edge/src/manifest.ts:201](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L201)

Versioned envelope written to `czap-boundary-manifest.json` by the
`@czap/astro` integration at `astro:build:done` -- for hosts that read
the manifest from disk instead of importing `virtual:czap/boundaries`.

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapBoundaryManifest"`

Defined in: [edge/src/manifest.ts:202](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L202)

***

### \_version

> `readonly` **\_version**: `2`

Defined in: [edge/src/manifest.ts:204](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L204)

v2: entries carry a deduplicated `outputs` pool; `outputsByTier` cells are pool indices.

***

### boundaries

> `readonly` **boundaries**: [`BoundaryManifest`](../type-aliases/BoundaryManifest.md)

Defined in: [edge/src/manifest.ts:205](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L205)

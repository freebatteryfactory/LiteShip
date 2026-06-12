[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestFile

# Interface: BoundaryManifestFile

Defined in: [edge/src/manifest.ts:191](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L191)

Versioned envelope written to `czap-boundary-manifest.json` by the
`@czap/astro` integration at `astro:build:done` -- for hosts that read
the manifest from disk instead of importing `virtual:czap/boundaries`.

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapBoundaryManifest"`

Defined in: [edge/src/manifest.ts:192](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L192)

***

### \_version

> `readonly` **\_version**: `2`

Defined in: [edge/src/manifest.ts:194](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L194)

v2: entries carry a deduplicated `outputs` pool; `outputsByTier` cells are pool indices.

***

### boundaries

> `readonly` **boundaries**: [`BoundaryManifest`](../type-aliases/BoundaryManifest.md)

Defined in: [edge/src/manifest.ts:195](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L195)

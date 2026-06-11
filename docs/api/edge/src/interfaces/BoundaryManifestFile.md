[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestFile

# Interface: BoundaryManifestFile

Defined in: [edge/src/manifest.ts:179](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L179)

Versioned envelope written to `czap-boundary-manifest.json` by the
`@czap/astro` integration at `astro:build:done` -- for hosts that read
the manifest from disk instead of importing `virtual:czap/boundaries`.

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapBoundaryManifest"`

Defined in: [edge/src/manifest.ts:180](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L180)

***

### \_version

> `readonly` **\_version**: `2`

Defined in: [edge/src/manifest.ts:182](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L182)

v2: entries carry a deduplicated `outputs` pool; `outputsByTier` cells are pool indices.

***

### boundaries

> `readonly` **boundaries**: [`BoundaryManifest`](../type-aliases/BoundaryManifest.md)

Defined in: [edge/src/manifest.ts:183](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L183)

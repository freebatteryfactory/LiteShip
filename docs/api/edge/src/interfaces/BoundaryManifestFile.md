[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestFile

# Interface: BoundaryManifestFile

Defined in: [edge/src/manifest.ts:196](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L196)

Versioned envelope written to `czap-boundary-manifest.json` by the
`@czap/astro` integration at `astro:build:done` -- for hosts that read
the manifest from disk instead of importing `virtual:czap/boundaries`.

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapBoundaryManifest"`

Defined in: [edge/src/manifest.ts:197](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L197)

***

### \_version

> `readonly` **\_version**: `2`

Defined in: [edge/src/manifest.ts:199](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L199)

v2: entries carry a deduplicated `outputs` pool; `outputsByTier` cells are pool indices.

***

### boundaries

> `readonly` **boundaries**: [`BoundaryManifest`](../type-aliases/BoundaryManifest.md)

Defined in: [edge/src/manifest.ts:200](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L200)

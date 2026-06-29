[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestFile

# Interface: BoundaryManifestFile

Defined in: [edge/src/manifest.ts:225](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L225)

Versioned envelope written to `czap-boundary-manifest.json` by the
`@czap/astro` integration at `astro:build:done` -- for hosts that read
the manifest from disk instead of importing `virtual:czap/boundaries`.

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapBoundaryManifest"`

Defined in: [edge/src/manifest.ts:226](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L226)

***

### \_version

> `readonly` **\_version**: `2`

Defined in: [edge/src/manifest.ts:228](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L228)

v2: entries carry a deduplicated `outputs` pool; `outputsByTier` cells are pool indices.

***

### boundaries

> `readonly` **boundaries**: [`BoundaryManifest`](../type-aliases/BoundaryManifest.md)

Defined in: [edge/src/manifest.ts:229](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L229)

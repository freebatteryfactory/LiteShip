[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / BoundaryManifestFile

# Interface: BoundaryManifestFile

Defined in: edge/src/manifest.ts:114

Versioned envelope written to `czap-boundary-manifest.json` by the
`@czap/astro` integration at `astro:build:done` -- for hosts that read
the manifest from disk instead of importing `virtual:czap/boundaries`.

## Properties

### \_tag

> `readonly` **\_tag**: `"CzapBoundaryManifest"`

Defined in: edge/src/manifest.ts:115

***

### \_version

> `readonly` **\_version**: `1`

Defined in: edge/src/manifest.ts:116

***

### boundaries

> `readonly` **boundaries**: [`BoundaryManifest`](../type-aliases/BoundaryManifest.md)

Defined in: edge/src/manifest.ts:117

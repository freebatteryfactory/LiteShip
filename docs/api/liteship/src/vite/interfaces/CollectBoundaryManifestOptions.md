[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / CollectBoundaryManifestOptions

# Interface: CollectBoundaryManifestOptions

Defined in: vite/dist/boundary-manifest.d.ts:20

Options for [collectBoundaryManifest](../functions/collectBoundaryManifest.md).

## Properties

### boundaryDir?

> `readonly` `optional` **boundaryDir?**: `string`

Defined in: vite/dist/boundary-manifest.d.ts:25

Extra directory holding boundary definitions -- mirror of the plugin's
`dirs.boundary` override; scanned in addition to the project walk.

***

### container?

> `readonly` `optional` **container?**: `string`

Defined in: vite/dist/boundary-manifest.d.ts:31

Selector the auto-emitted viewport `@container` containment is declared
on (default `:root`) -- mirror of the plugin's `quantize.container`, so
the manifest-served CSS matches the transform layer's containment target.

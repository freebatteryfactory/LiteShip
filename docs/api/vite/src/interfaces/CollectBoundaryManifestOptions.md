[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / CollectBoundaryManifestOptions

# Interface: CollectBoundaryManifestOptions

Defined in: [vite/src/boundary-manifest.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/boundary-manifest.ts#L43)

Options for [collectBoundaryManifest](../functions/collectBoundaryManifest.md).

## Properties

### boundaryDir?

> `readonly` `optional` **boundaryDir?**: `string`

Defined in: [vite/src/boundary-manifest.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/boundary-manifest.ts#L48)

Extra directory holding boundary definitions -- mirror of the plugin's
`dirs.boundary` override; scanned in addition to the project walk.

***

### container?

> `readonly` `optional` **container?**: `string`

Defined in: [vite/src/boundary-manifest.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/boundary-manifest.ts#L54)

Selector the auto-emitted viewport `@container` containment is declared
on (default `:root`) -- mirror of the plugin's `quantize.container`, so
the manifest-served CSS matches the transform layer's containment target.

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / VirtualModuleData

# Interface: VirtualModuleData

Defined in: vite/dist/virtual-modules.d.ts:55

Optional dynamic data threaded from the plugin into
[loadVirtualModule](../functions/loadVirtualModule.md) for virtual modules whose content is derived
at build time rather than stubbed.

## Properties

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\>

Defined in: vite/dist/virtual-modules.d.ts:57

Boundary manifest for `virtual:liteship/boundaries` (from `collectBoundaryManifest`).

***

### boundaryAssetUrls?

> `readonly` `optional` **boundaryAssetUrls?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`number`, `string`\>\>\>\>

Defined in: vite/dist/virtual-modules.d.ts:59

Public asset URLs per boundary output-pool index.

***

### config?

> `readonly` `optional` **config?**: [`Config`](../../type-aliases/Config.md) \| `null`

Defined in: vite/dist/virtual-modules.d.ts:65

Validated root `liteship.config.ts` value, or null when the project has none.

***

### themes?

> `readonly` `optional` **themes?**: `Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>

Defined in: vite/dist/virtual-modules.d.ts:63

Theme manifest for `virtual:liteship/themes`.

***

### tokens?

> `readonly` `optional` **tokens?**: `Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>

Defined in: vite/dist/virtual-modules.d.ts:61

Token manifest for `virtual:liteship/tokens` and `virtual:liteship/tokens.css`.

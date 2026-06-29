[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / VirtualModuleData

# Interface: VirtualModuleData

Defined in: [vite/src/virtual-modules.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L89)

Optional dynamic data threaded from the plugin into
[loadVirtualModule](../functions/loadVirtualModule.md) for virtual modules whose content is derived
at build time rather than stubbed.

## Properties

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\>

Defined in: [vite/src/virtual-modules.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L91)

Boundary manifest for `virtual:czap/boundaries` (from `collectBoundaryManifest`).

***

### boundaryAssetUrls?

> `readonly` `optional` **boundaryAssetUrls?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`number`, `string`\>\>\>\>

Defined in: [vite/src/virtual-modules.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L93)

Public asset URLs per boundary output-pool index.

***

### themes?

> `readonly` `optional` **themes?**: `Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>

Defined in: [vite/src/virtual-modules.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L97)

Theme manifest for `virtual:czap/themes`.

***

### tokens?

> `readonly` `optional` **tokens?**: `Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>

Defined in: [vite/src/virtual-modules.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L95)

Token manifest for `virtual:czap/tokens` and `virtual:czap/tokens.css`.

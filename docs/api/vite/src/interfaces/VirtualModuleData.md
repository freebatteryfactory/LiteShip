[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / VirtualModuleData

# Interface: VirtualModuleData

Defined in: [vite/src/virtual-modules.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L90)

Optional dynamic data threaded from the plugin into
[loadVirtualModule](../functions/loadVirtualModule.md) for virtual modules whose content is derived
at build time rather than stubbed.

## Properties

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\>

Defined in: [vite/src/virtual-modules.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L92)

Boundary manifest for `virtual:liteship/boundaries` (from `collectBoundaryManifest`).

***

### boundaryAssetUrls?

> `readonly` `optional` **boundaryAssetUrls?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`number`, `string`\>\>\>\>

Defined in: [vite/src/virtual-modules.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L94)

Public asset URLs per boundary output-pool index.

***

### config?

> `readonly` `optional` **config?**: `Config` \| `null`

Defined in: [vite/src/virtual-modules.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L100)

Validated root `liteship.config.ts` value, or null when the project has none.

***

### themes?

> `readonly` `optional` **themes?**: `Readonly`\<`Record`\<`string`, [`ThemeManifestEntry`](../type-aliases/ThemeManifestEntry.md)\>\>

Defined in: [vite/src/virtual-modules.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L98)

Theme manifest for `virtual:liteship/themes`.

***

### tokens?

> `readonly` `optional` **tokens?**: `Readonly`\<`Record`\<`string`, [`TokenManifestEntry`](../type-aliases/TokenManifestEntry.md)\>\>

Defined in: [vite/src/virtual-modules.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L96)

Token manifest for `virtual:liteship/tokens` and `virtual:liteship/tokens.css`.

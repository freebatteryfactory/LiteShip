[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / VirtualModuleData

# Interface: VirtualModuleData

Defined in: [vite/src/virtual-modules.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L82)

Optional dynamic data threaded from the plugin into
[loadVirtualModule](../functions/loadVirtualModule.md) for virtual modules whose content is derived
at build time rather than stubbed.

## Properties

### boundaries?

> `readonly` `optional` **boundaries?**: `Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\>

Defined in: [vite/src/virtual-modules.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L84)

Boundary manifest for `virtual:czap/boundaries` (from `collectBoundaryManifest`).

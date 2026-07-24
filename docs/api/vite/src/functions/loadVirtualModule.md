[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / loadVirtualModule

# Function: loadVirtualModule()

> **loadVirtualModule**(`id`, `data?`): `string` \| `undefined`

Defined in: [vite/src/virtual-modules.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L138)

Return the source for a resolved virtual module ID.

`virtual:liteship/boundaries` exports the build-derived boundary manifest
when the plugin passes one via `data.boundaries`; without data it
degrades to an empty-object stub (valid JS for type-checkers and
bundlers running outside the plugin).

Token and theme virtual modules export build-collected definitions when
the plugin passes manifest data; without data they degrade to empty stubs
(valid for type-checkers and bundlers running outside the plugin).

The `hmr-client` module is the client-side HMR handler that the
plugin injects into the page via `transformIndexHtml`.

## Parameters

### id

`string`

### data?

[`VirtualModuleData`](../interfaces/VirtualModuleData.md)

## Returns

`string` \| `undefined`

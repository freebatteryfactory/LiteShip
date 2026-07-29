[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / loadVirtualModule

# Function: loadVirtualModule()

> **loadVirtualModule**(`id`, `data?`): `string` \| `undefined`

Defined in: vite/dist/virtual-modules.d.ts:84

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

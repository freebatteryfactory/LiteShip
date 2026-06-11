[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / loadVirtualModule

# Function: loadVirtualModule()

> **loadVirtualModule**(`id`, `data?`): `string` \| `undefined`

Defined in: [vite/src/virtual-modules.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/virtual-modules.ts#L102)

Return the source for a resolved virtual module ID.

`virtual:czap/boundaries` exports the build-derived boundary manifest
when the plugin passes one via `data.boundaries`; without data it
degrades to an empty-object stub (valid JS for type-checkers and
bundlers running outside the plugin).

The remaining data modules (tokens, themes) return empty-object stubs
-- their real content flows through the CSS transform hooks in the
plugin, which replaces token, theme, and quantize blocks inline.

The `hmr-client` module is the client-side HMR handler that the
plugin injects into the page via `transformIndexHtml`.

## Parameters

### id

`string`

### data?

[`VirtualModuleData`](../interfaces/VirtualModuleData.md)

## Returns

`string` \| `undefined`

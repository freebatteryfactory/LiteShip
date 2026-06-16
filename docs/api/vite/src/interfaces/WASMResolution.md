[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / WASMResolution

# Interface: WASMResolution

Defined in: [vite/src/wasm-resolve.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/wasm-resolve.ts#L27)

Successful WASM-resolution result: the absolute binary path plus the
search step that found it (useful for diagnostics).

## Properties

### filePath

> `readonly` **filePath**: `string`

Defined in: [vite/src/wasm-resolve.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/wasm-resolve.ts#L29)

Absolute filesystem path to the WASM binary.

***

### source

> `readonly` **source**: `"config"` \| `"crate"` \| `"package"` \| `"public"`

Defined in: [vite/src/wasm-resolve.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/wasm-resolve.ts#L31)

Which search step matched (`'config'`, `'crate'`, `'package'`, or `'public'`).

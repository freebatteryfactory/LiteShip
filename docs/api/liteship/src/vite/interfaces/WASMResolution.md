[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / WASMResolution

# Interface: WASMResolution

Defined in: vite/dist/wasm-resolve.d.ts:22

Successful WASM-resolution result: the absolute binary path plus the
search step that found it (useful for diagnostics).

## Properties

### filePath

> `readonly` **filePath**: `string`

Defined in: vite/dist/wasm-resolve.d.ts:24

Absolute filesystem path to the WASM binary.

***

### source

> `readonly` **source**: `"config"` \| `"crate"` \| `"package"` \| `"public"`

Defined in: vite/dist/wasm-resolve.d.ts:26

Which search step matched (`'config'`, `'crate'`, `'package'`, or `'public'`).

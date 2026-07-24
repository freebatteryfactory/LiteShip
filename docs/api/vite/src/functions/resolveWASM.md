[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / resolveWASM

# Function: resolveWASM()

> **resolveWASM**(`projectRoot`, `configPath?`, `resolvePackaged?`): [`WASMResolution`](../interfaces/WASMResolution.md) \| `null`

Defined in: [vite/src/wasm-resolve.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/wasm-resolve.ts#L74)

Resolve the liteship-compute WASM binary path.

`resolvePackaged` is the packaged-`@liteship/core` binary resolver, defaulting
to the real [resolvePackagedWasm](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/wasm-package-resolve.ts); injectable so a test simulating a
consumer with no shipped binary can force the `'package'` source absent and
drive the config/crate/public ordering deterministically off a temp root.

## Parameters

### projectRoot

`string`

### configPath?

`string`

### resolvePackaged?

() => `string` \| `null`

## Returns

[`WASMResolution`](../interfaces/WASMResolution.md) \| `null`

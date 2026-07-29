[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/vite](../README.md) / resolveWASM

# Function: resolveWASM()

> **resolveWASM**(`projectRoot`, `configPath?`, `resolvePackaged?`): [`WASMResolution`](../interfaces/WASMResolution.md) \| `null`

Defined in: vite/dist/wasm-resolve.d.ts:45

Resolve the liteship-compute WASM binary path.

`resolvePackaged` is the packaged-`@liteship/core` binary resolver, defaulting
to the real `resolvePackagedWasm`; injectable so a test simulating a
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

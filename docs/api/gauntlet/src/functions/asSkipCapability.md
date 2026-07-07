[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / asSkipCapability

# Function: asSkipCapability()

> **asSkipCapability**(`value`): `"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `"offscreen-canvas-absent"` \| `"gpu-absent"` \| `"eacces-untestable-as-root"` \| `undefined`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L69)

Narrow an arbitrary string to a [SkipCapability](../type-aliases/SkipCapability.md) (the runtime guard for a parsed value) — `undefined` if unknown.

## Parameters

### value

`string`

## Returns

`"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `"offscreen-canvas-absent"` \| `"gpu-absent"` \| `"eacces-untestable-as-root"` \| `undefined`

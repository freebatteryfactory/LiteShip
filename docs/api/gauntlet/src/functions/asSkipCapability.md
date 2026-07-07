[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / asSkipCapability

# Function: asSkipCapability()

> **asSkipCapability**(`value`): `"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `"offscreen-canvas-absent"` \| `"webcodecs-absent"` \| `"gpu-absent"` \| `"eacces-untestable-as-root"` \| `"symlink-unprivileged"` \| `"fixture-absent"` \| `"capsule-manifest-absent"` \| `undefined`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L73)

Narrow an arbitrary string to a [SkipCapability](../type-aliases/SkipCapability.md) (the runtime guard for a parsed value) — `undefined` if unknown.

## Parameters

### value

`string`

## Returns

`"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `"offscreen-canvas-absent"` \| `"webcodecs-absent"` \| `"gpu-absent"` \| `"eacces-untestable-as-root"` \| `"symlink-unprivileged"` \| `"fixture-absent"` \| `"capsule-manifest-absent"` \| `undefined`

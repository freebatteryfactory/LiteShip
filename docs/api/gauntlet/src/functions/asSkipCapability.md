[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / asSkipCapability

# Function: asSkipCapability()

> **asSkipCapability**(`value`): `"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `undefined`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L66)

Narrow an arbitrary string to a [SkipCapability](../type-aliases/SkipCapability.md) (the runtime guard for a parsed value) — `undefined` if unknown.

## Parameters

### value

`string`

## Returns

`"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `undefined`

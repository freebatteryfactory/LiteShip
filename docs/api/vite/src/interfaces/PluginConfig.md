[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PluginConfig

# Interface: PluginConfig

Defined in: [vite/src/plugin.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L65)

Configuration options for the [plugin](../functions/plugin.md) factory. Every field
is optional; omitted values use convention-based defaults.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<`"boundary"` \| `"style"` \| `"token"` \| `"theme"`, `string`\>\>

Defined in: [vite/src/plugin.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L67)

Override source directories for each primitive kind.

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [vite/src/plugin.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L71)

Named Vite environments to configure (browser / server / shader). Defaults to browser when omitted.

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [vite/src/plugin.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L69)

Toggle surgical HMR emission (default `true`).

***

### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

Defined in: [vite/src/plugin.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L80)

WASM runtime configuration. Omitted (the default) **auto-detects**: the
deterministic 3-step search in [resolveWASM](../functions/resolveWASM.md) runs, and the compute
binary is wired up automatically when one is found (no flag needed). Pass
`false` (or `{ enabled: false }`) to force it off, `true` (or
`{ enabled: true }`) to require it (warn if no binary resolves), or
`{ path }` to point at a specific binary.

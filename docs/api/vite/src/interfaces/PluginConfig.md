[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PluginConfig

# Interface: PluginConfig

Defined in: [vite/src/plugin.ts:40](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L40)

Configuration options for the [plugin](../functions/plugin.md) factory. Every field
is optional; omitted values use convention-based defaults.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<`"boundary"` \| `"style"` \| `"token"` \| `"theme"`, `string`\>\>

Defined in: [vite/src/plugin.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L42)

Override source directories for each primitive kind.

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [vite/src/plugin.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L46)

Named Vite environments to configure (browser / server / shader). Defaults to browser when omitted.

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [vite/src/plugin.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L44)

Toggle surgical HMR emission (default `true`).

***

### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

Defined in: [vite/src/plugin.ts:48](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L48)

Opt-in WASM runtime configuration (`true` or `{ enabled: true }`).

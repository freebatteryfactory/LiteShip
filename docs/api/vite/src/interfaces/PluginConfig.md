[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PluginConfig

# Interface: PluginConfig

Defined in: [vite/src/plugin.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L37)

Configuration options for the [plugin](../functions/plugin.md) factory. Every field
is optional; omitted values use convention-based defaults.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<`"style"` \| `"boundary"` \| `"token"` \| `"theme"`, `string`\>\>

Defined in: [vite/src/plugin.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L39)

Override source directories for each primitive kind.

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [vite/src/plugin.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L43)

Named Vite environments to configure (browser / server / shader).

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [vite/src/plugin.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L41)

Toggle surgical HMR emission (default `true`).

***

### wasm?

> `readonly` `optional` **wasm?**: `object`

Defined in: [vite/src/plugin.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/plugin.ts#L45)

Opt-in WASM runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### path?

> `readonly` `optional` **path?**: `string`

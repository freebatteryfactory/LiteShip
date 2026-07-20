[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CorePluginConfig

# Interface: CorePluginConfig

Defined in: [core/src/authoring/config.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L28)

Vite-plugin slice of a liteship [Config](../variables/Config.md): source directories per
primitive kind, HMR opt-in, environment targeting, and optional WASM hints.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<[`PrimitiveKind`](../type-aliases/PrimitiveKind.md), `string`\>\>

Defined in: [core/src/authoring/config.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L29)

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [core/src/authoring/config.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L31)

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [core/src/authoring/config.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L30)

***

### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

Defined in: [core/src/authoring/config.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L32)

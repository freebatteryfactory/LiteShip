[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / PluginConfig

# Interface: PluginConfig

Defined in: [\_spine/vite.d.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L36)

LiteShip Vite plugin discovery, HMR, environment, and WASM options.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<[`PrimitiveKind`](../type-aliases/PrimitiveKind.md), `string`\>\>

Defined in: [\_spine/vite.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L37)

***

### emitBoundaryAssets?

> `readonly` `optional` **emitBoundaryAssets?**: `boolean`

Defined in: [\_spine/vite.d.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L40)

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [\_spine/vite.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L39)

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [\_spine/vite.d.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L38)

***

### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

Defined in: [\_spine/vite.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L41)

[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Config

# Interface: Config

Defined in: [\_spine/config.d.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L20)

Immutable, content-addressed project configuration consumed by LiteShip hosts.

## Properties

### \_tag

> `readonly` **\_tag**: `"ConfigDef"`

Defined in: [\_spine/config.d.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L21)

***

### astro?

> `readonly` `optional` **astro?**: `object`

Defined in: [\_spine/config.d.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L28)

#### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

#### edgeRuntime?

> `readonly` `optional` **edgeRuntime?**: `boolean`

***

### boundaries

> `readonly` **boundaries**: `object`

Defined in: [\_spine/config.d.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L23)

#### Index Signature

\[`key`: `string`\]: `object`

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/config.d.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L22)

***

### styles

> `readonly` **styles**: `object`

Defined in: [\_spine/config.d.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L26)

#### Index Signature

\[`key`: `string`\]: `object`

***

### themes

> `readonly` **themes**: `object`

Defined in: [\_spine/config.d.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L25)

#### Index Signature

\[`key`: `string`\]: `object`

***

### tokens

> `readonly` **tokens**: `object`

Defined in: [\_spine/config.d.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L24)

#### Index Signature

\[`key`: `string`\]: `object`

***

### vite?

> `readonly` `optional` **vite?**: `object`

Defined in: [\_spine/config.d.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L27)

#### dirs?

> `readonly` `optional` **dirs?**: `object`

##### dirs.boundary?

> `optional` **boundary?**: `string`

##### dirs.style?

> `optional` **style?**: `string`

##### dirs.theme?

> `optional` **theme?**: `string`

##### dirs.token?

> `optional` **token?**: `string`

#### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

#### hmr?

> `readonly` `optional` **hmr?**: `boolean`

#### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

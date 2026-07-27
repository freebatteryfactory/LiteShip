[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Config

# Interface: Config

Defined in: [core/src/authoring/config.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L56)

Frozen, content-addressed result of [defineConfig](../functions/defineConfig.md).

## Properties

### \_tag

> `readonly` **\_tag**: `"ConfigDef"`

Defined in: [core/src/authoring/config.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L132)

***

### astro?

> `readonly` `optional` **astro?**: `object`

Defined in: [core/src/authoring/config.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L139)

#### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

#### edgeRuntime?

> `readonly` `optional` **edgeRuntime?**: `boolean`

***

### boundaries

> `readonly` **boundaries**: `object`

Defined in: [core/src/authoring/config.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L134)

#### Index Signature

\[`key`: `string`\]: `object`

***

### id

> `readonly` **id**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [core/src/authoring/config.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L133)

***

### styles

> `readonly` **styles**: `object`

Defined in: [core/src/authoring/config.ts:137](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L137)

#### Index Signature

\[`key`: `string`\]: `object`

***

### themes

> `readonly` **themes**: `object`

Defined in: [core/src/authoring/config.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L136)

#### Index Signature

\[`key`: `string`\]: `object`

***

### tokens

> `readonly` **tokens**: `object`

Defined in: [core/src/authoring/config.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L135)

#### Index Signature

\[`key`: `string`\]: `object`

***

### vite?

> `readonly` `optional` **vite?**: `object`

Defined in: [core/src/authoring/config.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L138)

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

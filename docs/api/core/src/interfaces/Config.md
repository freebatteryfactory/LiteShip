[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Config

# Interface: Config

Defined in: [core/src/authoring/config.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L54)

Frozen, content-addressed result of [defineConfig](../functions/defineConfig.md).

## Properties

### \_tag

> `readonly` **\_tag**: `"ConfigDef"`

Defined in: [core/src/authoring/config.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L122)

***

### astro?

> `readonly` `optional` **astro?**: `object`

Defined in: [core/src/authoring/config.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L129)

#### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

#### edgeRuntime?

> `readonly` `optional` **edgeRuntime?**: `boolean`

***

### boundaries

> `readonly` **boundaries**: `object`

Defined in: [core/src/authoring/config.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L124)

#### Index Signature

\[`key`: `string`\]: `object`

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: [core/src/authoring/config.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L123)

***

### styles

> `readonly` **styles**: `object`

Defined in: [core/src/authoring/config.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L127)

#### Index Signature

\[`key`: `string`\]: `object`

***

### themes

> `readonly` **themes**: `object`

Defined in: [core/src/authoring/config.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L126)

#### Index Signature

\[`key`: `string`\]: `object`

***

### tokens

> `readonly` **tokens**: `object`

Defined in: [core/src/authoring/config.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L125)

#### Index Signature

\[`key`: `string`\]: `object`

***

### vite?

> `readonly` `optional` **vite?**: `object`

Defined in: [core/src/authoring/config.ts:128](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L128)

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

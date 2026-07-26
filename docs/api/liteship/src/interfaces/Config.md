[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [liteship/src](../README.md) / Config

# Interface: Config

Defined in: core/dist/authoring/config.d.ts:40

Frozen, content-addressed result of [defineConfig](../functions/defineConfig.md).

## Properties

### \_tag

> `readonly` **\_tag**: `"ConfigDef"`

Defined in: core/dist/authoring/config.d.ts:50

***

### astro?

> `readonly` `optional` **astro?**: `object`

Defined in: core/dist/authoring/config.d.ts:57

#### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

#### edgeRuntime?

> `readonly` `optional` **edgeRuntime?**: `boolean`

***

### boundaries

> `readonly` **boundaries**: `object`

Defined in: core/dist/authoring/config.d.ts:52

#### Index Signature

\[`key`: `string`\]: `object`

***

### id

> `readonly` **id**: `ContentAddress`

Defined in: core/dist/authoring/config.d.ts:51

***

### styles

> `readonly` **styles**: `object`

Defined in: core/dist/authoring/config.d.ts:55

#### Index Signature

\[`key`: `string`\]: `object`

***

### themes

> `readonly` **themes**: `object`

Defined in: core/dist/authoring/config.d.ts:54

#### Index Signature

\[`key`: `string`\]: `object`

***

### tokens

> `readonly` **tokens**: `object`

Defined in: core/dist/authoring/config.d.ts:53

#### Index Signature

\[`key`: `string`\]: `object`

***

### vite?

> `readonly` `optional` **vite?**: `object`

Defined in: core/dist/authoring/config.d.ts:56

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

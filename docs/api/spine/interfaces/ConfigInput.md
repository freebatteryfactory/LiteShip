[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ConfigInput

# Interface: ConfigInput

Defined in: [\_spine/config.d.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L32)

User-facing input — no id, no _tag

## Properties

### astro?

> `readonly` `optional` **astro?**: `object`

Defined in: [\_spine/config.d.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L43)

#### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

#### edgeRuntime?

> `readonly` `optional` **edgeRuntime?**: `boolean`

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Record`\<`string`, [`Boundary`](Boundary.md)\<`string`, readonly \[`string`, `string`\]\>\>

Defined in: [\_spine/config.d.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L33)

***

### styles?

> `readonly` `optional` **styles?**: `Record`\<`string`, [`Style`](Style.md)\<[`Boundary`](Boundary.md)\<`string`, readonly \[`string`, `string`\]\>\>\>

Defined in: [\_spine/config.d.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L36)

***

### themes?

> `readonly` `optional` **themes?**: `Record`\<`string`, [`Theme`](Theme.md)\<readonly `string`[]\>\>

Defined in: [\_spine/config.d.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L35)

***

### tokens?

> `readonly` `optional` **tokens?**: `Record`\<`string`, [`Token`](Token.md)\<`string`, readonly `string`[]\>\>

Defined in: [\_spine/config.d.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L34)

***

### vite?

> `readonly` `optional` **vite?**: `object`

Defined in: [\_spine/config.d.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/config.d.ts#L37)

#### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<`"boundary"` \| `"token"` \| `"theme"` \| `"style"`, `string`\>\>

#### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

#### hmr?

> `readonly` `optional` **hmr?**: `boolean`

#### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

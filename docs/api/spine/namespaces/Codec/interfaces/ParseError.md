[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [Codec](../README.md) / ParseError

# Interface: ParseError

Defined in: [\_spine/core.d.ts:1300](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1300)

The encode/decode failure — structurally `@liteship/error`'s `ParseError`
variant (a `TaggedError<'ParseError'>` carrying `source`/`detail` and the
optional machine fields `code`/`offset`). Parity pinned in the same test.

## Properties

### \_tag

> `readonly` **\_tag**: `"ParseError"`

Defined in: [\_spine/core.d.ts:1301](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1301)

***

### code?

> `readonly` `optional` **code?**: `string`

Defined in: [\_spine/core.d.ts:1305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1305)

***

### detail

> `readonly` **detail**: `string`

Defined in: [\_spine/core.d.ts:1304](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1304)

***

### message

> `readonly` **message**: `string`

Defined in: [\_spine/core.d.ts:1302](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1302)

***

### offset?

> `readonly` `optional` **offset?**: `number`

Defined in: [\_spine/core.d.ts:1306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1306)

***

### source

> `readonly` **source**: `string`

Defined in: [\_spine/core.d.ts:1303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1303)

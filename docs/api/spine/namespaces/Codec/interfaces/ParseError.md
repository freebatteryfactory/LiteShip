[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [Codec](../README.md) / ParseError

# Interface: ParseError

Defined in: [\_spine/core.d.ts:1515](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1515)

The encode/decode failure — structurally `@liteship/error`'s `ParseError`
variant (a `TaggedError<'ParseError'>` carrying `source`/`detail` and the
optional machine fields `code`/`offset`). Parity pinned in the same test.

## Properties

### \_tag

> `readonly` **\_tag**: `"ParseError"`

Defined in: [\_spine/core.d.ts:1516](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1516)

***

### code?

> `readonly` `optional` **code?**: `string`

Defined in: [\_spine/core.d.ts:1520](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1520)

***

### detail

> `readonly` **detail**: `string`

Defined in: [\_spine/core.d.ts:1519](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1519)

***

### message

> `readonly` **message**: `string`

Defined in: [\_spine/core.d.ts:1517](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1517)

***

### offset?

> `readonly` `optional` **offset?**: `number`

Defined in: [\_spine/core.d.ts:1521](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1521)

***

### source

> `readonly` **source**: `string`

Defined in: [\_spine/core.d.ts:1518](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1518)

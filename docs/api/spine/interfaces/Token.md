[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Token

# Interface: Token\<N, Axes\>

Defined in: [\_spine/design.d.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L38)

Immutable, content-addressed design token with optional adaptive axes.

## Type Parameters

### N

`N` *extends* `string` = `string`

### Axes

`Axes` *extends* readonly `string`[] = readonly `string`[]

## Properties

### \_tag

> `readonly` **\_tag**: `"TokenDef"`

Defined in: [\_spine/design.d.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L39)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [\_spine/design.d.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L40)

***

### axes

> `readonly` **axes**: `Axes`

Defined in: [\_spine/design.d.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L44)

***

### category

> `readonly` **category**: `"color"` \| `"spacing"` \| `"typography"` \| `"shadow"` \| `"radius"` \| `"animation"` \| `"effect"`

Defined in: [\_spine/design.d.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L43)

***

### cssProperty

> `readonly` **cssProperty**: `` `--${string}` ``

Defined in: [\_spine/design.d.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L47)

***

### fallback

> `readonly` **fallback**: `unknown`

Defined in: [\_spine/design.d.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L46)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/design.d.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L41)

***

### name

> `readonly` **name**: `N`

Defined in: [\_spine/design.d.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L42)

***

### values

> `readonly` **values**: `Record`\<`string`, `unknown`\>

Defined in: [\_spine/design.d.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L45)

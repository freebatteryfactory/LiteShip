[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Style

# Interface: Style\<B\>

Defined in: [\_spine/design.d.ts:108](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L108)

Content-addressed adaptive style bound to one boundary definition.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"StyleDef"`

Defined in: [\_spine/design.d.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L109)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [\_spine/design.d.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L110)

***

### base

> `readonly` **base**: [`StyleLayer`](StyleLayer.md)

Defined in: [\_spine/design.d.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L113)

***

### boundary?

> `readonly` `optional` **boundary?**: `B`

Defined in: [\_spine/design.d.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L112)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/design.d.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L111)

***

### states?

> `readonly` `optional` **states?**: `{ readonly [S in string]?: StyleLayer }`

Defined in: [\_spine/design.d.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L114)

***

### transition?

> `readonly` `optional` **transition?**: `object`

Defined in: [\_spine/design.d.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L115)

#### duration

> `readonly` **duration**: [`Millis`](../type-aliases/Millis.md)

#### easing?

> `readonly` `optional` **easing?**: `string`

#### properties?

> `readonly` `optional` **properties?**: readonly `string`[]

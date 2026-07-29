[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / SystemContext

# Interface: SystemContext\<Q, R, W\>

Defined in: [\_spine/core.d.ts:760](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L760)

Trusted read/write context supplied to one declared system.

## Type Parameters

### Q

`Q` *extends* [`PartTuple`](../type-aliases/PartTuple.md) = [`PartTuple`](../type-aliases/PartTuple.md)

### R

`R` *extends* [`PartTuple`](../type-aliases/PartTuple.md) = [`PartTuple`](../type-aliases/PartTuple.md)

### W

`W` *extends* [`PartTuple`](../type-aliases/PartTuple.md) = [`PartTuple`](../type-aliases/PartTuple.md)

## Methods

### optional()

> **optional**\<`P`\>(`entity`, `part`): [`PartValue`](../type-aliases/PartValue.md)\<`P`\> \| `undefined`

Defined in: [\_spine/core.d.ts:766](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L766)

#### Type Parameters

##### P

`P` *extends* [`AnyPart`](../type-aliases/AnyPart.md)

#### Parameters

##### entity

[`SystemEntity`](SystemEntity.md)

##### part

`P`

#### Returns

[`PartValue`](../type-aliases/PartValue.md)\<`P`\> \| `undefined`

***

### query()

> **query**\<`P`\>(...`parts`): readonly [`Entity`](Entity.md)\<[`TuplePart`](../type-aliases/TuplePart.md)\<`P`\>\>[]

Defined in: [\_spine/core.d.ts:767](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L767)

#### Type Parameters

##### P

`P` *extends* readonly [`ReadablePart`](../type-aliases/ReadablePart.md)\<`Q`, `R`\>[]

#### Parameters

##### parts

...`P`

#### Returns

readonly [`Entity`](Entity.md)\<[`TuplePart`](../type-aliases/TuplePart.md)\<`P`\>\>[]

***

### read()

> **read**\<`P`\>(`entity`, `part`): [`PartValue`](../type-aliases/PartValue.md)\<`P`\>

Defined in: [\_spine/core.d.ts:765](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L765)

#### Type Parameters

##### P

`P` *extends* [`AnyPart`](../type-aliases/AnyPart.md)

#### Parameters

##### entity

[`SystemEntity`](SystemEntity.md)

##### part

`P`

#### Returns

[`PartValue`](../type-aliases/PartValue.md)\<`P`\>

***

### write()

> **write**\<`P`\>(`entity`, `part`, `value`): `void`

Defined in: [\_spine/core.d.ts:768](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L768)

#### Type Parameters

##### P

`P` *extends* [`AnyPart`](../type-aliases/AnyPart.md)

#### Parameters

##### entity

[`SystemEntity`](SystemEntity.md)

##### part

`P`

##### value

[`PartValue`](../type-aliases/PartValue.md)\<`P`\>

#### Returns

`void`

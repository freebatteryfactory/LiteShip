[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / System

# Interface: System\<Q, R, W\>

Defined in: [\_spine/core.d.ts:772](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L772)

Typed ECS system with explicit query/read/write authority.

## Type Parameters

### Q

`Q` *extends* [`PartTuple`](../type-aliases/PartTuple.md) = [`PartTuple`](../type-aliases/PartTuple.md)

### R

`R` *extends* [`PartTuple`](../type-aliases/PartTuple.md) = [`PartTuple`](../type-aliases/PartTuple.md)

### W

`W` *extends* [`PartTuple`](../type-aliases/PartTuple.md) = [`PartTuple`](../type-aliases/PartTuple.md)

## Properties

### \[SpineSystemWitness\]

> `readonly` **\[SpineSystemWitness\]**: `true`

Defined in: [\_spine/core.d.ts:782](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L782)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/core.d.ts:777](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L777)

***

### query

> `readonly` **query**: `Q`

Defined in: [\_spine/core.d.ts:778](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L778)

***

### reads

> `readonly` **reads**: `R`

Defined in: [\_spine/core.d.ts:779](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L779)

***

### writes

> `readonly` **writes**: `W`

Defined in: [\_spine/core.d.ts:780](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L780)

## Methods

### execute()

> **execute**(`entities`, `context`): `void`

Defined in: [\_spine/core.d.ts:781](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L781)

#### Parameters

##### entities

readonly [`SystemEntity`](SystemEntity.md)[]

##### context

[`SystemContext`](SystemContext.md)\<`Q`, `R`, `W`\>

#### Returns

`void`

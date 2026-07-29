[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Part

# Interface: Part\<T, Name, Encoded\>

Defined in: [\_spine/core.d.ts:724](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L724)

One minted, schema-backed ECS component declaration.

## Type Parameters

### T

`T` = `unknown`

### Name

`Name` *extends* `string` = `string`

### Encoded

`Encoded` = `unknown`

## Properties

### \[SpinePartWitness\]

> `readonly` **\[SpinePartWitness\]**: `T`

Defined in: [\_spine/core.d.ts:728](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L728)

***

### name

> `readonly` **name**: `Name`

Defined in: [\_spine/core.d.ts:725](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L725)

***

### retention

> `readonly` **retention**: [`PartRetentionPolicy`](../type-aliases/PartRetentionPolicy.md)

Defined in: [\_spine/core.d.ts:727](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L727)

***

### schema

> `readonly` **schema**: [`KernelSchema`](KernelSchema.md)\<`T`, `Encoded`\>

Defined in: [\_spine/core.d.ts:726](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L726)

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / StandardJsonSchemaProjection

# Interface: StandardJsonSchemaProjection\<I, A\>

Defined in: [core/src/schema/standard.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L56)

Explicit encoded-input and decoded-output schemas required to advertise JSON Schema hooks.

## Type Parameters

### I

`I`

### A

`A`

## Properties

### input

> `readonly` **input**: [`Schema`](Schema.md)\<`I`, `I`\>

Defined in: [core/src/schema/standard.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L58)

Schema describing values before decode.

***

### output

> `readonly` **output**: [`Schema`](Schema.md)\<`A`, `A`\>

Defined in: [core/src/schema/standard.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L60)

Schema describing values after decode.

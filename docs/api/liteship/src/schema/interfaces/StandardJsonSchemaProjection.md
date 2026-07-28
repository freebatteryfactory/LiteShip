[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / StandardJsonSchemaProjection

# Interface: StandardJsonSchemaProjection\<I, A\>

Defined in: core/dist/schema/standard.d.ts:48

Explicit encoded-input and decoded-output schemas required to advertise JSON Schema hooks.

## Type Parameters

### I

`I`

### A

`A`

## Properties

### input

> `readonly` **input**: [`Schema`](Schema.md)\<`I`, `I`\>

Defined in: core/dist/schema/standard.d.ts:50

Schema describing values before decode.

***

### output

> `readonly` **output**: [`Schema`](Schema.md)\<`A`, `A`\>

Defined in: core/dist/schema/standard.d.ts:52

Schema describing values after decode.

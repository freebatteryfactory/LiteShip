[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Codec

# Interface: Codec\<A, I\>

Defined in: [\_spine/core.d.ts:1493](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1493)

Bidirectional schema-backed codec between input and decoded values.

## Type Parameters

### A

`A`

### I

`I` = `A`

## Properties

### schema

> `readonly` **schema**: [`SchemaPort`](../type-aliases/SchemaPort.md)\<`A`, `I`\>

Defined in: [\_spine/core.d.ts:1494](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1494)

## Methods

### decode()

> **decode**(`input`): [`Result`](../namespaces/Codec/type-aliases/Result.md)\<`A`, [`ParseError`](../namespaces/Codec/interfaces/ParseError.md)\>

Defined in: [\_spine/core.d.ts:1498](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1498)

Validate untrusted input into the typed value. Sync `Result` — never an Effect (Wave 8).

#### Parameters

##### input

`unknown`

#### Returns

[`Result`](../namespaces/Codec/type-aliases/Result.md)\<`A`, [`ParseError`](../namespaces/Codec/interfaces/ParseError.md)\>

***

### encode()

> **encode**(`value`): [`Result`](../namespaces/Codec/type-aliases/Result.md)\<`I`, [`ParseError`](../namespaces/Codec/interfaces/ParseError.md)\>

Defined in: [\_spine/core.d.ts:1496](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1496)

Validate a domain value into its wire form. Sync `Result` — never an Effect (Wave 8).

#### Parameters

##### value

`A`

#### Returns

[`Result`](../namespaces/Codec/type-aliases/Result.md)\<`I`, [`ParseError`](../namespaces/Codec/interfaces/ParseError.md)\>

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / TupleEncoded

# Type Alias: TupleEncoded\<E\>

> **TupleEncoded**\<`E`\> = `{ readonly [K in keyof E]: InferEncoded<E[K]> }`

Defined in: core/dist/schema/infer.d.ts:65

The encoded (wire) tuple type of `schema.tuple(...elements)` — the [TupleType](TupleType.md) shape over `InferEncoded`.

## Type Parameters

### E

`E` *extends* readonly [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>[]

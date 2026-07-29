[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / TupleType

# Type Alias: TupleType\<E\>

> **TupleType**\<`E`\> = `{ readonly [K in keyof E]: Infer<E[K]> }`

Defined in: core/dist/schema/infer.d.ts:61

The decoded type of `schema.tuple(...elements)`: a READONLY tuple that mirrors each
element position's `Infer`. The homomorphic mapped type over `keyof E` preserves
tuple-ness (arity and per-position types), so `schema.tuple(schema.number, schema.string)` infers
`readonly [number, string]`, not `readonly (number | string)[]`.

## Type Parameters

### E

`E` *extends* readonly [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>[]

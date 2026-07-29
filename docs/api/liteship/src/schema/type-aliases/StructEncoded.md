[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / StructEncoded

# Type Alias: StructEncoded\<F\>

> **StructEncoded**\<`F`\> = `Prettify`\<`{ readonly [K in keyof F as IsOptional<F[K]> extends true ? never : K]: InferEncoded<F[K]> }` & `{ readonly [K in keyof F as IsOptional<F[K]> extends true ? K : never]?: InferEncoded<F[K]> }`\>

Defined in: core/dist/schema/infer.d.ts:50

The encoded object type of `schema.struct(fields)` — the [StructType](StructType.md) shape over `Encoded`.

## Type Parameters

### F

`F` *extends* [`SchemaFields`](SchemaFields.md)

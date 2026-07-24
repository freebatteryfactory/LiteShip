[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StructEncoded

# Type Alias: StructEncoded\<F\>

> **StructEncoded**\<`F`\> = `Prettify`\<`{ readonly [K in keyof F as IsOptional<F[K]> extends true ? never : K]: InferEncoded<F[K]> }` & `{ readonly [K in keyof F as IsOptional<F[K]> extends true ? K : never]?: InferEncoded<F[K]> }`\>

Defined in: [core/src/schema/infer.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/infer.ts#L51)

The encoded object type of `schema.struct(fields)` — the [StructType](StructType.md) shape over `Encoded`.

## Type Parameters

### F

`F` *extends* `SchemaFields`

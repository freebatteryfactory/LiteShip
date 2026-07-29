[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / StructType

# Type Alias: StructType\<F\>

> **StructType**\<`F`\> = `Prettify`\<`{ readonly [K in keyof F as IsOptional<F[K]> extends true ? never : K]: Infer<F[K]> }` & `{ readonly [K in keyof F as IsOptional<F[K]> extends true ? K : never]?: Infer<F[K]> }`\>

Defined in: core/dist/schema/infer.d.ts:44

The decoded object type of `schema.struct(fields)`: required fields become required
keys, `OptionalSchema`-marked fields become OPTIONAL keys (`k?:`). Key
remapping via `as` drives the required/optional split off `IsOptional`.

## Type Parameters

### F

`F` *extends* [`SchemaFields`](SchemaFields.md)

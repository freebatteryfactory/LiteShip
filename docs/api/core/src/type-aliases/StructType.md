[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / StructType

# Type Alias: StructType\<F\>

> **StructType**\<`F`\> = `Prettify`\<`{ readonly [K in keyof F as IsOptional<F[K]> extends true ? never : K]: Infer<F[K]> }` & `{ readonly [K in keyof F as IsOptional<F[K]> extends true ? K : never]?: Infer<F[K]> }`\>

Defined in: [core/src/schema/infer.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/infer.ts#L44)

The decoded object type of `schema.struct(fields)`: required fields become required
keys, `OptionalSchema`-marked fields become OPTIONAL keys (`k?:`). Key
remapping via `as` drives the required/optional split off `IsOptional`.

## Type Parameters

### F

`F` *extends* `SchemaFields`

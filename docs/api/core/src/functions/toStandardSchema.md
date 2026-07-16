[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / toStandardSchema

# Function: toStandardSchema()

> **toStandardSchema**\<`A`, `I`\>(`schema`, `decode`): [`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

Defined in: [core/src/schema/standard.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L74)

Bridge a kernel [Schema](../interfaces/Schema.md) to a `StandardSchemaV1` + `StandardJSONSchemaV1`.
`~standard.validate` runs `decode(schema, value)` and lowers its result;
`~standard.jsonSchema.input/output` derive the JSON-Schema via [toJsonSchema](toJsonSchema.md).
`A` is the decoded type, `I` the encoded/input type (defaults to `A`); both are
phantom on the returned handle, sourced from the schema value.

## Type Parameters

### A

`A`

### I

`I` = `A`

## Parameters

### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `I`\>

### decode

`SchemaDecoder`\<`A`, `I`\>

## Returns

[`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

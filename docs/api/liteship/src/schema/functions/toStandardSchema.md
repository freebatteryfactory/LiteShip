[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / toStandardSchema

# Function: toStandardSchema()

> **toStandardSchema**\<`A`, `I`\>(`schema`, `decode`): [`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

Defined in: core/dist/schema/standard.d.ts:61

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

[`SchemaDecoder`](../type-aliases/SchemaDecoder.md)\<`A`, `I`\>

## Returns

[`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

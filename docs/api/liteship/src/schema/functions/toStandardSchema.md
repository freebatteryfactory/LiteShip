[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / toStandardSchema

# Function: toStandardSchema()

## Call Signature

> **toStandardSchema**\<`A`, `I`\>(`schema`, `decode`): [`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

Defined in: core/dist/schema/standard.d.ts:71

Bridge a kernel [Schema](../interfaces/Schema.md) to `StandardSchemaV1`. `~standard.validate`
runs `decode(schema, value)` and lowers its result. Pass an explicit
[StandardJsonSchemaProjection](../interfaces/StandardJsonSchemaProjection.md) to opt into JSON hooks. Both projections
are derived eagerly, before the hook is advertised, so an unsupported AST can
never become a delayed consumer crash.
`A` is the decoded type, `I` the encoded/input type (defaults to `A`); both are
phantom on the returned handle, sourced from the schema value.

### Type Parameters

#### A

`A`

#### I

`I` = `A`

### Parameters

#### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `I`\>

#### decode

[`SchemaDecoder`](../type-aliases/SchemaDecoder.md)\<`A`, `I`\>

### Returns

[`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

## Call Signature

> **toStandardSchema**\<`A`, `I`\>(`schema`, `decode`, `projection`): [`LiteshipStandardJsonSchema`](../type-aliases/LiteshipStandardJsonSchema.md)\<`I`, `A`\>

Defined in: core/dist/schema/standard.d.ts:72

Bridge a kernel [Schema](../interfaces/Schema.md) to `StandardSchemaV1`. `~standard.validate`
runs `decode(schema, value)` and lowers its result. Pass an explicit
[StandardJsonSchemaProjection](../interfaces/StandardJsonSchemaProjection.md) to opt into JSON hooks. Both projections
are derived eagerly, before the hook is advertised, so an unsupported AST can
never become a delayed consumer crash.
`A` is the decoded type, `I` the encoded/input type (defaults to `A`); both are
phantom on the returned handle, sourced from the schema value.

### Type Parameters

#### A

`A`

#### I

`I` = `A`

### Parameters

#### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `I`\>

#### decode

[`SchemaDecoder`](../type-aliases/SchemaDecoder.md)\<`A`, `I`\>

#### projection

[`StandardJsonSchemaProjection`](../interfaces/StandardJsonSchemaProjection.md)\<`I`, `A`\>

### Returns

[`LiteshipStandardJsonSchema`](../type-aliases/LiteshipStandardJsonSchema.md)\<`I`, `A`\>

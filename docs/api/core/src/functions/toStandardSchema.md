[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / toStandardSchema

# Function: toStandardSchema()

## Call Signature

> **toStandardSchema**\<`A`, `I`\>(`schema`, `decode`): [`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

Defined in: [core/src/schema/standard.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L86)

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

`SchemaDecoder`\<`A`, `I`\>

### Returns

[`LiteshipStandardSchema`](../type-aliases/LiteshipStandardSchema.md)\<`I`, `A`\>

## Call Signature

> **toStandardSchema**\<`A`, `I`\>(`schema`, `decode`, `projection`): [`LiteshipStandardJsonSchema`](../type-aliases/LiteshipStandardJsonSchema.md)\<`I`, `A`\>

Defined in: [core/src/schema/standard.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/standard.ts#L90)

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

`SchemaDecoder`\<`A`, `I`\>

#### projection

[`StandardJsonSchemaProjection`](../interfaces/StandardJsonSchemaProjection.md)\<`I`, `A`\>

### Returns

[`LiteshipStandardJsonSchema`](../type-aliases/LiteshipStandardJsonSchema.md)\<`I`, `A`\>

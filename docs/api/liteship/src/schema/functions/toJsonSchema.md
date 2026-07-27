[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / toJsonSchema

# Function: toJsonSchema()

> **toJsonSchema**(`schema`): [`JsonSchemaObject`](../type-aliases/JsonSchemaObject.md)

Defined in: core/dist/schema/to-json-schema.d.ts:24

Walk a kernel [Schema](../interfaces/Schema.md) value and derive the JSON-Schema OBJECT a command
descriptor's `inputSchema` / `outputSchema` carries. The root must be a
`struct` (a command I/O contract is always an object); a top-level `brand` is
followed to its base first. Throws `UnsupportedError` when the root is not an
object, or when any nested node has no sound mapping in the structural dialect.

## Parameters

### schema

[`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

## Returns

[`JsonSchemaObject`](../type-aliases/JsonSchemaObject.md)

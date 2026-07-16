[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / toJsonSchema

# Function: toJsonSchema()

> **toJsonSchema**(`schema`): `JsonSchemaObject`

Defined in: [core/src/schema/to-json-schema.ts:198](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/to-json-schema.ts#L198)

Walk a kernel [Schema](../interfaces/Schema.md) value and derive the JSON-Schema OBJECT a command
descriptor's `inputSchema` / `outputSchema` carries. The root must be a
`struct` (a command I/O contract is always an object); a top-level `brand` is
followed to its base first. Throws `UnsupportedError` when the root is not an
object, or when any nested node has no sound mapping in the structural dialect.

## Parameters

### schema

[`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

## Returns

`JsonSchemaObject`

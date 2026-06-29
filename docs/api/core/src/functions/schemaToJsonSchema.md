[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / schemaToJsonSchema

# Function: schemaToJsonSchema()

> **schemaToJsonSchema**\<`T`\>(`schema`): [`JsonSchemaObject`](../interfaces/JsonSchemaObject.md)

Defined in: [core/src/json-schema-from-schema.ts:315](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L315)

Walk a `Schema` AST and derive the JSON-Schema OBJECT a command descriptor's
`inputSchema` / `outputSchema` carries. The top-level schema MUST be a
`Schema.Struct` (`TypeLiteral`) — a command's I/O contract is always an
object — so the result is the tighter `JsonSchemaObject`
(`{ type:'object', properties, required? }`). Throws `UnsupportedError` when
the root is not an object, or when any nested node has no sound mapping in the
structural dialect.

Accepts any `Schema.Schema<T>` — only `.ast` is read.

## Type Parameters

### T

`T`

## Parameters

### schema

`Schema`\<`T`\>

## Returns

[`JsonSchemaObject`](../interfaces/JsonSchemaObject.md)

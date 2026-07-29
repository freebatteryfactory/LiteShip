[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / JsonSchemaFragment

# Type Alias: JsonSchemaFragment

> **JsonSchemaFragment** = `object`

Defined in: core/dist/schema/to-json-schema.d.ts:3

A derived JSON-Schema fragment. Every field optional at the fragment level.

## Properties

### const?

> `readonly` `optional` **const?**: [`LiteralValue`](LiteralValue.md)

Defined in: core/dist/schema/to-json-schema.d.ts:8

***

### enum?

> `readonly` `optional` **enum?**: readonly [`LiteralValue`](LiteralValue.md)[]

Defined in: core/dist/schema/to-json-schema.d.ts:7

***

### items?

> `readonly` `optional` **items?**: `JsonSchemaFragment`

Defined in: core/dist/schema/to-json-schema.d.ts:9

***

### properties?

> `readonly` `optional` **properties?**: `Readonly`\<`Record`\<`string`, `JsonSchemaFragment`\>\>

Defined in: core/dist/schema/to-json-schema.d.ts:5

***

### required?

> `readonly` `optional` **required?**: readonly `string`[]

Defined in: core/dist/schema/to-json-schema.d.ts:6

***

### type?

> `readonly` `optional` **type?**: `string` \| readonly `string`[]

Defined in: core/dist/schema/to-json-schema.d.ts:4

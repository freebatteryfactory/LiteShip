[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / JsonSchemaFragment

# Interface: JsonSchemaFragment

Defined in: [core/src/json-schema-from-schema.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L61)

A derived JSON-Schema fragment in the `validateStructural` / `CommandJsonSchema`
dialect. Every field is optional at the fragment level; the TOP-LEVEL result
of a `Schema.Struct` is the tighter `JsonSchemaObject` (always `type:'object'`
with `properties`).

`const`/`enum` carry JSON-primitive literal values (string | number | boolean
| null) — the only literal kinds Effect's `Literal` AST and the structural
validator both model.

## Extended by

- [`JsonSchemaObject`](JsonSchemaObject.md)

## Properties

### const?

> `readonly` `optional` **const?**: `string` \| `number` \| `boolean` \| `null`

Defined in: [core/src/json-schema-from-schema.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L66)

***

### enum?

> `readonly` `optional` **enum?**: readonly (`string` \| `number` \| `boolean` \| `null`)[]

Defined in: [core/src/json-schema-from-schema.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L65)

***

### items?

> `readonly` `optional` **items?**: `JsonSchemaFragment`

Defined in: [core/src/json-schema-from-schema.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L67)

***

### properties?

> `readonly` `optional` **properties?**: `Readonly`\<`Record`\<`string`, `JsonSchemaFragment`\>\>

Defined in: [core/src/json-schema-from-schema.ts:63](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L63)

***

### required?

> `readonly` `optional` **required?**: readonly `string`[]

Defined in: [core/src/json-schema-from-schema.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L64)

***

### type?

> `readonly` `optional` **type?**: `string` \| readonly `string`[]

Defined in: [core/src/json-schema-from-schema.ts:62](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L62)

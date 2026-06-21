[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / JsonSchemaObject

# Interface: JsonSchemaObject

Defined in: [core/src/json-schema-from-schema.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L76)

The TOP-LEVEL object shape a command descriptor's `inputSchema` /
`outputSchema` carries. Structurally a `JsonSchemaFragment` pinned to
`type:'object'` — assignable to `@czap/_spine`'s `CommandJsonSchema` (the
`properties` values are `unknown` there; here they are typed fragments).

## Extends

- [`JsonSchemaFragment`](JsonSchemaFragment.md)

## Properties

### const?

> `readonly` `optional` **const?**: `string` \| `number` \| `boolean` \| `null`

Defined in: [core/src/json-schema-from-schema.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L66)

#### Inherited from

[`JsonSchemaFragment`](JsonSchemaFragment.md).[`const`](JsonSchemaFragment.md#const)

***

### enum?

> `readonly` `optional` **enum?**: readonly (`string` \| `number` \| `boolean` \| `null`)[]

Defined in: [core/src/json-schema-from-schema.ts:65](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L65)

#### Inherited from

[`JsonSchemaFragment`](JsonSchemaFragment.md).[`enum`](JsonSchemaFragment.md#enum)

***

### items?

> `readonly` `optional` **items?**: [`JsonSchemaFragment`](JsonSchemaFragment.md)

Defined in: [core/src/json-schema-from-schema.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L67)

#### Inherited from

[`JsonSchemaFragment`](JsonSchemaFragment.md).[`items`](JsonSchemaFragment.md#items)

***

### properties

> `readonly` **properties**: `Readonly`\<`Record`\<`string`, [`JsonSchemaFragment`](JsonSchemaFragment.md)\>\>

Defined in: [core/src/json-schema-from-schema.ts:78](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L78)

#### Overrides

[`JsonSchemaFragment`](JsonSchemaFragment.md).[`properties`](JsonSchemaFragment.md#properties)

***

### required?

> `readonly` `optional` **required?**: readonly `string`[]

Defined in: [core/src/json-schema-from-schema.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L79)

#### Overrides

[`JsonSchemaFragment`](JsonSchemaFragment.md).[`required`](JsonSchemaFragment.md#required)

***

### type

> `readonly` **type**: `"object"`

Defined in: [core/src/json-schema-from-schema.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/json-schema-from-schema.ts#L77)

#### Overrides

[`JsonSchemaFragment`](JsonSchemaFragment.md).[`type`](JsonSchemaFragment.md#type)

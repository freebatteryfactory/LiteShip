[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / AIParamSchema

# Interface: AIParamSchema

Defined in: compiler/dist/ai-manifest.d.ts:59

Parameter schema for a single [AIAction](AIAction.md) parameter.

Mirrors a subset of JSON Schema (`type`, `enum`, `min`, `max`) that is
losslessly translatable to both tool-calling and schema validation.

## Properties

### description

> `readonly` **description**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:71

Human-readable description.

***

### enum?

> `readonly` `optional` **enum?**: readonly `string`[]

Defined in: compiler/dist/ai-manifest.d.ts:63

Permitted enum values.

***

### max?

> `readonly` `optional` **max?**: `number`

Defined in: compiler/dist/ai-manifest.d.ts:67

Numeric maximum (inclusive).

***

### min?

> `readonly` `optional` **min?**: `number`

Defined in: compiler/dist/ai-manifest.d.ts:65

Numeric minimum (inclusive).

***

### required?

> `readonly` `optional` **required?**: `boolean`

Defined in: compiler/dist/ai-manifest.d.ts:69

Whether the parameter must be present; defaults to `false` (JSON Schema convention).

***

### type

> `readonly` **type**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:61

JSON Schema type (`'string'` | `'number'` | `'integer'` | `'boolean'` | `'array'` | `'object'`).

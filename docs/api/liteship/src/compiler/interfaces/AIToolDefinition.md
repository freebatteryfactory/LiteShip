[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIToolDefinition

# Interface: AIToolDefinition

Defined in: compiler/dist/ai-manifest.d.ts:132

Tool definition in the function-calling format emitted by
[AIManifestCompiler.generateToolDefinitions](../variables/AIManifestCompiler.md#generatetooldefinitions).

Directly consumable by the Anthropic, OpenAI, and Google tool-calling
APIs — fields are a superset of their intersecting requirements.

## Properties

### description

> `readonly` **description**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:136

Action description (becomes the tool description).

***

### name

> `readonly` **name**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:134

Action name.

***

### parameters

> `readonly` **parameters**: `Record`\<`string`, `unknown`\>

Defined in: compiler/dist/ai-manifest.d.ts:138

JSON Schema for parameters.

***

### returns

> `readonly` **returns**: `Record`\<`string`, `unknown`\>

Defined in: compiler/dist/ai-manifest.d.ts:140

JSON Schema for the return shape.

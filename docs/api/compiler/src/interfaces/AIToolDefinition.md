[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / AIToolDefinition

# Interface: AIToolDefinition

Defined in: [compiler/src/ai-manifest.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L166)

Tool definition in the function-calling format emitted by
[AIManifestCompiler.generateToolDefinitions](../variables/AIManifestCompiler.md#generatetooldefinitions).

Directly consumable by the Anthropic, OpenAI, and Google tool-calling
APIs — fields are a superset of their intersecting requirements.

## Properties

### description

> `readonly` **description**: `string`

Defined in: [compiler/src/ai-manifest.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L170)

Action description (becomes the tool description).

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/ai-manifest.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L168)

Action name.

***

### parameters

> `readonly` **parameters**: `Record`\<`string`, `unknown`\>

Defined in: [compiler/src/ai-manifest.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L172)

JSON Schema for parameters.

***

### returns

> `readonly` **returns**: `Record`\<`string`, `unknown`\>

Defined in: [compiler/src/ai-manifest.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L174)

JSON Schema for the return shape.

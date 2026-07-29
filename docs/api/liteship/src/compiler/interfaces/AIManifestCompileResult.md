[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / AIManifestCompileResult

# Interface: AIManifestCompileResult

Defined in: compiler/dist/ai-manifest.d.ts:149

Output of [AIManifestCompiler.compile](../variables/AIManifestCompiler.md#compile).

Bundles the source manifest together with the three derived artifacts
(tools, schema, prompt) so consumers can wire all three into an LLM
session in a single step.

## Properties

### jsonSchema

> `readonly` **jsonSchema**: `Record`\<`string`, `unknown`\>

Defined in: compiler/dist/ai-manifest.d.ts:155

JSON Schema for validating LLM output.

***

### manifest

> `readonly` **manifest**: [`AIManifest`](AIManifest.md)

Defined in: compiler/dist/ai-manifest.d.ts:151

The source manifest.

***

### systemPrompt

> `readonly` **systemPrompt**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:157

System prompt describing dimensions, slots, actions, and constraints.

***

### toolDefinitions

> `readonly` **toolDefinitions**: readonly [`AIToolDefinition`](AIToolDefinition.md)[]

Defined in: compiler/dist/ai-manifest.d.ts:153

Tool definitions for function calling.

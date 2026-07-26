[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIManifest

# Interface: AIManifest

Defined in: compiler/dist/ai-manifest.d.ts:94

Top-level AI manifest describing the UI surface to an LLM.

Consumed by [AIManifestCompiler.compile](../variables/AIManifestCompiler.md#compile) to produce tool
definitions, a JSON Schema, and a system prompt in a single pass.

## Properties

### actions

> `readonly` **actions**: `Record`\<`string`, [`AIAction`](AIAction.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:102

Invocable actions.

***

### constraints

> `readonly` **constraints**: readonly [`AIConstraint`](AIConstraint.md)[]

Defined in: compiler/dist/ai-manifest.d.ts:104

Cross-cutting invariants.

***

### dimensions

> `readonly` **dimensions**: `Record`\<`string`, [`AIDimension`](AIDimension.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:98

State-space dimensions.

***

### slots

> `readonly` **slots**: `Record`\<`string`, [`AISlot`](AISlot.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:100

Content slots.

***

### version

> `readonly` **version**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:96

Manifest schema version.

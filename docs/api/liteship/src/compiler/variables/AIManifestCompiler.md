[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIManifestCompiler

# Variable: AIManifestCompiler

> `const` **AIManifestCompiler**: `object`

Defined in: compiler/dist/ai-manifest.d.ts:287

AI manifest compiler namespace.

Compiles an [AIManifest](../interfaces/AIManifest.md) into tool definitions (function calling format),
a JSON Schema for validation, and a system prompt describing available
dimensions, slots, actions, and constraints. Also provides validation of
AI-generated output against the manifest schema.

## Type Declaration

### compile

> `readonly` **compile**: *typeof* `compile`

### generateSystemPrompt

> `readonly` **generateSystemPrompt**: *typeof* `generateSystemPrompt`

### generateToolDefinitions

> `readonly` **generateToolDefinitions**: *typeof* `generateToolDefinitions`

### validateAIOutput

> `readonly` **validateAIOutput**: *typeof* `validateAIOutput`

## Example

```ts
import { AIManifestCompiler } from '@liteship/compiler';

const manifest = {
  dimensions: { theme: { states: ['light', 'dark'], current: 'light', exclusive: true, description: 'Color theme' } },
  slots: { hero: { accepts: ['image', 'video'], description: 'Hero section' } },
  actions: { setTheme: { params: { theme: { type: 'string', enum: ['light', 'dark'], required: true, description: 'Theme' } }, effects: ['repaint'], description: 'Switch theme' } },
};
const compiled = AIManifestCompiler.compile(manifest);
const valid = AIManifestCompiler.validateAIOutput(
  { action: 'setTheme', params: { theme: 'dark' } },
  manifest,
);
```

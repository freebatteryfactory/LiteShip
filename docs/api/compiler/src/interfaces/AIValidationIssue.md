[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / AIValidationIssue

# Interface: AIValidationIssue

Defined in: [compiler/src/ai-manifest.ts:443](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L443)

Structured validation failure for AI-generated output — the teach-by-data
shape consumed by LLM re-prompting loops. `message` is the prose form
surfaced through the parallel `errors` array.

## Properties

### expected

> `readonly` **expected**: `string`

Defined in: [compiler/src/ai-manifest.ts:447](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L447)

What the manifest expects at that path.

***

### hint

> `readonly` **hint**: `string`

Defined in: [compiler/src/ai-manifest.ts:451](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L451)

Literal next step to repair the output.

***

### message

> `readonly` **message**: `string`

Defined in: [compiler/src/ai-manifest.ts:453](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L453)

Prose form — identical to the corresponding `errors` entry.

***

### path

> `readonly` **path**: `string`

Defined in: [compiler/src/ai-manifest.ts:445](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L445)

Dot path into the output, e.g. 'params.cols' or 'dimensions.layout'.

***

### received

> `readonly` **received**: `string`

Defined in: [compiler/src/ai-manifest.ts:449](https://github.com/heyoub/LiteShip/blob/main/packages/compiler/src/ai-manifest.ts#L449)

What the output actually carried.

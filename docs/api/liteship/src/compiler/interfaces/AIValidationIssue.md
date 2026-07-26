[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIValidationIssue

# Interface: AIValidationIssue

Defined in: compiler/dist/ai-manifest.d.ts:195

Structured validation failure for AI-generated output — the teach-by-data
shape consumed by LLM re-prompting loops. `message` is the prose form
surfaced through the parallel `errors` array.

## Properties

### expected

> `readonly` **expected**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:199

What the manifest expects at that path.

***

### hint

> `readonly` **hint**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:203

Literal next step to repair the output.

***

### message

> `readonly` **message**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:205

Prose form — identical to the corresponding `errors` entry.

***

### path

> `readonly` **path**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:197

Dot path into the output, e.g. 'params.cols' or 'dimensions.layout'.

***

### received

> `readonly` **received**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:201

What the output actually carried.

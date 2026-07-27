[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / AIValidationIssue

# Interface: AIValidationIssue

Defined in: [\_spine/compiler.d.ts:274](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L274)

Structured validation failure for AI-generated output — the teach-by-data
shape consumed by LLM re-prompting loops. `message` is the prose form
surfaced through the parallel `errors` array.

## Properties

### expected

> `readonly` **expected**: `string`

Defined in: [\_spine/compiler.d.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L278)

What the manifest expects at that path.

***

### hint

> `readonly` **hint**: `string`

Defined in: [\_spine/compiler.d.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L282)

Literal next step to repair the output.

***

### message

> `readonly` **message**: `string`

Defined in: [\_spine/compiler.d.ts:284](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L284)

Prose form — identical to the corresponding `errors` entry.

***

### path

> `readonly` **path**: `string`

Defined in: [\_spine/compiler.d.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L276)

Dot path into the output, e.g. 'params.cols' or 'dimensions.layout'.

***

### received

> `readonly` **received**: `string`

Defined in: [\_spine/compiler.d.ts:280](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L280)

What the output actually carried.

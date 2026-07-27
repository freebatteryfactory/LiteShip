[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / AIValidationIssue

# Interface: AIValidationIssue

Defined in: [\_spine/compiler.d.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L262)

Structured validation failure for AI-generated output — the teach-by-data
shape consumed by LLM re-prompting loops. `message` is the prose form
surfaced through the parallel `errors` array.

## Properties

### expected

> `readonly` **expected**: `string`

Defined in: [\_spine/compiler.d.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L266)

What the manifest expects at that path.

***

### hint

> `readonly` **hint**: `string`

Defined in: [\_spine/compiler.d.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L270)

Literal next step to repair the output.

***

### message

> `readonly` **message**: `string`

Defined in: [\_spine/compiler.d.ts:272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L272)

Prose form — identical to the corresponding `errors` entry.

***

### path

> `readonly` **path**: `string`

Defined in: [\_spine/compiler.d.ts:264](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L264)

Dot path into the output, e.g. 'params.cols' or 'dimensions.layout'.

***

### received

> `readonly` **received**: `string`

Defined in: [\_spine/compiler.d.ts:268](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L268)

What the output actually carried.

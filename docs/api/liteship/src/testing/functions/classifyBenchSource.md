[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / classifyBenchSource

# Function: classifyBenchSource()

> **classifyBenchSource**(`source`): `"real"` \| `"placeholder"`

Defined in: core/dist/evidence/bench-classify.d.ts:10

Classify a generated bench file: 'real' if at least one `bench(...)`
closure contains executable code, 'placeholder' if every closure body is
empty or comment-only (or no bench call exists at all).

The scanner is deliberately linear: comments and string literals are masked,
then balanced braces locate each arrow closure. That keeps hostile generated
input bounded without mistaking comment text or nested closures for evidence.

## Parameters

### source

`string`

## Returns

`"real"` \| `"placeholder"`

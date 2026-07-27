[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / classifyBenchSource

# Function: classifyBenchSource()

> **classifyBenchSource**(`source`): `"real"` \| `"placeholder"`

Defined in: core/dist/evidence/bench-classify.d.ts:10

Classify a generated bench file: 'real' if at least one `bench(...)`
closure contains executable code, 'placeholder' if every closure body is
empty or comment-only (or no bench call exists at all).

The lazy body capture stops at the first `}`, so a real body with nested
braces is truncated — but the truncated prefix is still non-empty, which
is all the classification needs.

## Parameters

### source

`string`

## Returns

`"real"` \| `"placeholder"`

[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / classifyBenchSource

# Function: classifyBenchSource()

> **classifyBenchSource**(`source`): `"real"` \| `"placeholder"`

Defined in: core/dist/evidence/bench-classify.d.ts:11

Classify a generated bench file: 'real' if at least one `bench(...)`
closure contains executable code, 'placeholder' if every closure body is
empty or comment-only (or no bench call exists at all).

The scanner is deliberately linear: comments, strings, templates, and regular
expressions are masked, then delimiter depth locates the callback arrow and
its balanced body. That keeps hostile-generated input bounded without
mistaking lexical decoys or a nested default-parameter arrow for evidence.

## Parameters

### source

`string`

## Returns

`"real"` \| `"placeholder"`

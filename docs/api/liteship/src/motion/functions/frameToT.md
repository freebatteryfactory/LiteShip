[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / frameToT

# Function: frameToT()

> **frameToT**(`frame`, `totalFrames`): `number`

Defined in: core/dist/motion/transition-program.d.ts:168

Map a 0-based frame index to the normalized program time `t ∈ [0,1]` that
[sampleProgram](sampleProgram.md) samples — ENDPOINT-INCLUSIVE: `frame / max(1, totalFrames - 1)`,
so `frame = 0 → 0` and `frame = totalFrames - 1 → 1` (the last frame lands exactly on
the terminal pose). A degenerate timeline (`totalFrames ≤ 1`) has no span, so its only
frame maps to `0`. Out-of-range frames are clamped to `[0,1]`.

## Parameters

### frame

`number`

### totalFrames

`number`

## Returns

`number`

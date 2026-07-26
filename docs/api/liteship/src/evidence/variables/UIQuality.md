[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / UIQuality

# Variable: UIQuality

> `const` **UIQuality**: `object`

Defined in: core/dist/evidence/ui-quality.d.ts:37

UIQuality — adaptive-bitrate-style UI fidelity gate.

Combines buffer occupancy (how far ahead the generator is) and device
[MotionTier](../../../../quantizer/src/type-aliases/MotionTier.md) into a composite score and maps it via [Boundary](../../type-aliases/Boundary.md)
with hysteresis to a [UIQualityTier](../type-aliases/UIQualityTier.md).

## Type Declaration

### boundary

> **boundary**: `UIQualityBoundary`

The pre-built boundary — exposed so callers can compile it to CSS/GLSL directly.

### make

> **make**: *typeof* `_make`

Build a stateful evaluator that remembers the previous tier for hysteresis.

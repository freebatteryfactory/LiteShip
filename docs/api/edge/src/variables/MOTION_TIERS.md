[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / MOTION\_TIERS

# Variable: MOTION\_TIERS

> `const` **MOTION\_TIERS**: readonly \[`"none"`, `"transitions"`, `"animations"`, `"physics"`, `"compute"`\]

Defined in: edge/src/manifest.ts:27

Every [MotionTier](../../../quantizer/src/type-aliases/MotionTier.md), in escalation order. Kept in lockstep with the
`MotionTier` union in `@czap/core` -- the `satisfies` clause plus the
exhaustiveness check below fail compilation if the vocabulary drifts.

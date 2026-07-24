[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / MOTION\_TIERS

# Variable: MOTION\_TIERS

> `const` **MOTION\_TIERS**: readonly \[`"none"`, `"transitions"`, `"animations"`, `"physics"`, `"compute"`\]

Defined in: [edge/src/manifest.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/manifest.ts#L28)

Every [MotionTier](../../../quantizer/src/type-aliases/MotionTier.md), in escalation order. Kept in lockstep with the
`MotionTier` union in `@liteship/core` -- the `satisfies` clause plus the
exhaustiveness check below fail compilation if the vocabulary drifts.

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / DESIGN\_TIERS

# Variable: DESIGN\_TIERS

> `const` **DESIGN\_TIERS**: readonly \[`"minimal"`, `"standard"`, `"enhanced"`, `"rich"`\]

Defined in: [edge/src/manifest.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/edge/src/manifest.ts#L41)

Every `DesignTier`, in escalation order. Kept in lockstep with the
`DesignTier` union in `@czap/detect` -- the `satisfies` clause plus the
exhaustiveness check below fail compilation if the vocabulary drifts.

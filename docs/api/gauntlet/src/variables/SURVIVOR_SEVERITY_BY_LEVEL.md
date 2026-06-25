[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SURVIVOR\_SEVERITY\_BY\_LEVEL

# Variable: SURVIVOR\_SEVERITY\_BY\_LEVEL

> `const` **SURVIVOR\_SEVERITY\_BY\_LEVEL**: `Readonly`\<`Record`\<[`AssuranceLevel`](../type-aliases/AssuranceLevel.md), [`Severity`](../type-aliases/Severity.md)\>\>

Defined in: [gauntlet/src/gates/mutation-divergence.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/mutation-divergence.ts#L70)

The severity a SURVIVOR earns at a given effective level — the kill-floor
calibration, exported DATA a downstream owner can redline (sibling to the
coverage-class severity matrix). L4/L3 survivors BLOCK; L2 warns; L1/L0 are
advisory debt.

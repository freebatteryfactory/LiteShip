[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MCDC\_SEVERITY\_BY\_LEVEL

# Variable: MCDC\_SEVERITY\_BY\_LEVEL

> `const` **MCDC\_SEVERITY\_BY\_LEVEL**: `Readonly`\<`Record`\<[`AssuranceLevel`](../type-aliases/AssuranceLevel.md), [`Severity`](../type-aliases/Severity.md)\>\>

Defined in: [gauntlet/src/gates/mcdc-coverage.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/mcdc-coverage.ts#L64)

The severity an UNCOVERED condition earns at a given effective level — the MC/DC-floor
calibration, exported DATA a downstream owner can redline (sibling to the
mutation-divergence kill-floor matrix). L4/L3 BLOCK (DO-178B Level A demands full
MC/DC); L2 warns; L1/L0 are advisory debt.

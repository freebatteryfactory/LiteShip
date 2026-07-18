[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / DIVERGENCE\_SEVERITY\_BY\_LEVEL

# Variable: DIVERGENCE\_SEVERITY\_BY\_LEVEL

> `const` **DIVERGENCE\_SEVERITY\_BY\_LEVEL**: `Readonly`\<`Record`\<[`AssuranceLevel`](../type-aliases/AssuranceLevel.md), [`Severity`](../type-aliases/Severity.md)\>\>

Defined in: [gauntlet/src/gates/transition-conformance.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/transition-conformance.ts#L61)

The severity a DIVERGENCE earns at a given family level — the same calibration ladder
the mutation gate's SURVIVOR_SEVERITY_BY_LEVEL uses, exported DATA a downstream owner
can redline. L4/L3 divergences BLOCK; L2 warns; L1/L0 are advisory debt.

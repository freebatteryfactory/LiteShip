[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / makeOracleDivergenceGate

# Function: makeOracleDivergenceGate()

> **makeOracleDivergenceGate**(`spec`): [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/make-oracle-divergence-gate.ts:313](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/make-oracle-divergence-gate.ts#L313)

Make a triangulated oracle-divergence [Gate](../interfaces/Gate.md) for one `spec` — the
parametric factory the three LiteShip divergence gates share. The fold, the
exclude-vs-miss refinement, and the self-proving red/green/mutation fixtures are
shared; the spec supplies only the property, the marker property, and the prose.

## Parameters

### spec

[`OracleDivergenceSpec`](../interfaces/OracleDivergenceSpec.md)

## Returns

[`Gate`](../interfaces/Gate.md)

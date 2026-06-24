[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutantVerdict

# Type Alias: MutantVerdict\<M\>

> **MutantVerdict**\<`M`\> = [`KilledVerdict`](../interfaces/KilledVerdict.md)\<`M`\> \| [`SurvivedVerdict`](../interfaces/SurvivedVerdict.md)\<`M`\> \| [`NoCoverageVerdict`](../interfaces/NoCoverageVerdict.md)\<`M`\> \| [`EquivalentVerdict`](../interfaces/EquivalentVerdict.md)\<`M`\>

Defined in: [audit/src/mutation-verdict.ts:155](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L155)

The closed verdict union — a `_tag` data discriminant (composition). Generic over the
mutant shape `M` (defaulting to the classic [Mutant](../interfaces/Mutant.md)); the MC/DC builder
instantiates it at `ConditionMutant` so the same evaluator serves both paths.

## Type Parameters

### M

`M` *extends* [`MutantCore`](../interfaces/MutantCore.md) = [`Mutant`](../interfaces/Mutant.md)

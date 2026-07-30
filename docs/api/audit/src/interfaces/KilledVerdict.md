[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / KilledVerdict

# Interface: KilledVerdict\<M\>

Defined in: [audit/src/mutation-verdict.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L114)

A killed mutant — a covering test failed on it (adequate coverage). Generic over the
mutant shape `M` (defaulting to the classic [Mutant](Mutant.md)) so the SAME verdict path
carries an MC/DC `ConditionMutant` (operator = a condition-force) without a fork — the
evaluator reads only the operator-agnostic [MutantCore](MutantCore.md) fields.

## Type Parameters

### M

`M` *extends* [`MutantCore`](MutantCore.md) = [`Mutant`](Mutant.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"killed"`

Defined in: [audit/src/mutation-verdict.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L115)

***

### coveringTests

> `readonly` **coveringTests**: readonly `string`[]

Defined in: [audit/src/mutation-verdict.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L118)

The covering tests that were run (the evidence the mutation was exercised).

***

### mutant

> `readonly` **mutant**: `M`

Defined in: [audit/src/mutation-verdict.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L116)

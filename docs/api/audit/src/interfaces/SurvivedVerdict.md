[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SurvivedVerdict

# Interface: SurvivedVerdict\<M\>

Defined in: [audit/src/mutation-verdict.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L117)

A surviving mutant — every covering test passed on it (a coverage divergence).

## Type Parameters

### M

`M` *extends* [`MutantCore`](MutantCore.md) = [`Mutant`](Mutant.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"survived"`

Defined in: [audit/src/mutation-verdict.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L118)

***

### coveringTests

> `readonly` **coveringTests**: readonly `string`[]

Defined in: [audit/src/mutation-verdict.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L121)

The covering tests that all passed (the evidence the behaviour is untested).

***

### mutant

> `readonly` **mutant**: `M`

Defined in: [audit/src/mutation-verdict.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L119)

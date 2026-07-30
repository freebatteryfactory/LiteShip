[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / SurvivedVerdict

# Interface: SurvivedVerdict\<M\>

Defined in: [audit/src/mutation-verdict.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L122)

A surviving mutant — every covering test passed on it (a coverage divergence).

## Type Parameters

### M

`M` *extends* [`MutantCore`](MutantCore.md) = [`Mutant`](Mutant.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"survived"`

Defined in: [audit/src/mutation-verdict.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L123)

***

### coveringTests

> `readonly` **coveringTests**: readonly `string`[]

Defined in: [audit/src/mutation-verdict.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L126)

The covering tests that all passed (the evidence the behaviour is untested).

***

### mutant

> `readonly` **mutant**: `M`

Defined in: [audit/src/mutation-verdict.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L124)

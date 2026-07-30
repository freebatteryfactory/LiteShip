[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / InconclusiveVerdict

# Interface: InconclusiveVerdict\<M\>

Defined in: [audit/src/mutation-verdict.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L166)

An INCONCLUSIVE mutant — the runner threw instead of returning a verdict (a
subprocess spawn fault, an exit/report disagreement, a zero-tests-executed run).
The refusal to mint a false kill/survive is correct and stays; what this verdict
changes is the BLAST RADIUS: the campaign records the site fail-closed (it counts
in the score denominator and folds to a blocking finding) and CONTINUES, instead
of one unmintable verdict 80 minutes in discarding every verdict already earned
(the twice-measured cron defect: runs 30342905791 + 30526718746, both aborted by
the same target file). NEVER cached — the fault is transient infrastructure, not
a property of the mutant.

## Type Parameters

### M

`M` *extends* [`MutantCore`](MutantCore.md) = [`Mutant`](Mutant.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"inconclusive"`

Defined in: [audit/src/mutation-verdict.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L167)

***

### coveringTests

> `readonly` **coveringTests**: readonly `string`[]

Defined in: [audit/src/mutation-verdict.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L170)

The covering tests the runner was asked to execute.

***

### mutant

> `readonly` **mutant**: `M`

Defined in: [audit/src/mutation-verdict.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L168)

***

### reason

> `readonly` **reason**: `string`

Defined in: [audit/src/mutation-verdict.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L172)

The runner's refusal message — WHY no trustworthy verdict exists.

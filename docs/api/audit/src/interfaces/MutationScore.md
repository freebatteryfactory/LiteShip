[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutationScore

# Interface: MutationScore

Defined in: [audit/src/mutation-verdict.ts:336](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L336)

The mutation SCORE summary over a set of verdicts — killed / scored-total + survivors.

## Properties

### equivalent

> `readonly` **equivalent**: `number`

Defined in: [audit/src/mutation-verdict.ts:350](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L350)

Justified-equivalent mutants (registry-recorded) — excluded from [total](#total).

***

### killed

> `readonly` **killed**: `number`

Defined in: [audit/src/mutation-verdict.ts:344](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L344)

Mutants a covering test killed.

***

### noCoverage

> `readonly` **noCoverage**: `number`

Defined in: [audit/src/mutation-verdict.ts:348](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L348)

Mutants with no covering test at all (untested).

***

### score

> `readonly` **score**: `number`

Defined in: [audit/src/mutation-verdict.ts:359](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L359)

The kill score in [0, 1] — `killed / total`, where `total` is the NON-EQUIVALENT
mutant count. A no-coverage mutant counts AGAINST the score (untested); an
`equivalent` mutant is excluded entirely (no test could ever kill it, so counting
it would cap the honest score below 1.0 forever). `total === 0` → a score of `1`
(vacuously perfect — no killable behaviour to test). This is the number the L4
kill-floor compares and the ratchet baseline pins.

***

### survived

> `readonly` **survived**: `number`

Defined in: [audit/src/mutation-verdict.ts:346](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L346)

Mutants every covering test passed on (coverage divergences).

***

### total

> `readonly` **total**: `number`

Defined in: [audit/src/mutation-verdict.ts:342](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L342)

The SCORED total — killed + survived + no-coverage (the non-equivalent mutants).
EXCLUDES `equivalent` mutants (they are not a coverage gap, so they are not part
of the kill denominator).

[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / MutationScore

# Interface: MutationScore

Defined in: [audit/src/mutation-verdict.ts:385](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L385)

The mutation SCORE summary over a set of verdicts — killed / scored-total + survivors.

## Properties

### equivalent

> `readonly` **equivalent**: `number`

Defined in: [audit/src/mutation-verdict.ts:399](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L399)

Justified-equivalent mutants (registry-recorded) — excluded from [total](#total).

***

### inconclusive

> `readonly` **inconclusive**: `number`

Defined in: [audit/src/mutation-verdict.ts:401](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L401)

Mutants whose runner refused a trustworthy verdict — counted in [total](#total).

***

### killed

> `readonly` **killed**: `number`

Defined in: [audit/src/mutation-verdict.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L393)

Mutants a covering test killed. (Total also counts [inconclusive](#inconclusive).)

***

### noCoverage

> `readonly` **noCoverage**: `number`

Defined in: [audit/src/mutation-verdict.ts:397](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L397)

Mutants with no covering test at all (untested).

***

### score

> `readonly` **score**: `number`

Defined in: [audit/src/mutation-verdict.ts:410](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L410)

The kill score in [0, 1] — `killed / total`, where `total` is the NON-EQUIVALENT
mutant count. A no-coverage mutant counts AGAINST the score (untested); an
`equivalent` mutant is excluded entirely (no test could ever kill it, so counting
it would cap the honest score below 1.0 forever). `total === 0` → a score of `1`
(vacuously perfect — no killable behaviour to test). This is the number the L4
kill-floor compares and the ratchet baseline pins.

***

### survived

> `readonly` **survived**: `number`

Defined in: [audit/src/mutation-verdict.ts:395](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L395)

Mutants every covering test passed on (coverage divergences).

***

### total

> `readonly` **total**: `number`

Defined in: [audit/src/mutation-verdict.ts:391](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L391)

The SCORED total — killed + survived + no-coverage (the non-equivalent mutants).
EXCLUDES `equivalent` mutants (they are not a coverage gap, so they are not part
of the kill denominator).

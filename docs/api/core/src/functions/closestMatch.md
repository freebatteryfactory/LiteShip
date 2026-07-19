[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / closestMatch

# Function: closestMatch()

> **closestMatch**(`input`, `candidates`, `threshold`): `string` \| `undefined`

Defined in: [core/src/internal/string-distance.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/string-distance.ts#L44)

The nearest `candidate` to `input` by [editDistance](editDistance.md), or `undefined` when
none is within `threshold` — the "did you mean 'x'?" primitive. The `threshold`
is CALLER-supplied so one picker serves every policy: the assets registry passes
`Math.max(1, Math.min(2, Math.floor(input.length / 3)))`, the command dispatcher
passes `3`, the scene compiler passes `2`.

Ties are broken deterministically: the smallest distance wins, and among equal
distances the FIRST candidate in input order wins (the scan keeps a match only on
a STRICTLY smaller distance). A match is returned only when its distance `≤ threshold`.

## Parameters

### input

`string`

### candidates

readonly `string`[]

### threshold

`number`

## Returns

`string` \| `undefined`

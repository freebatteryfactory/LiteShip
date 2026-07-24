[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / editDistance

# Function: editDistance()

> **editDistance**(`a`, `b`): `number`

Defined in: [core/src/evidence/closest-match.ts:15](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/closest-match.ts#L15)

Levenshtein edit distance between `a` and `b` — one O(n·m) dynamic-programming
table over two rolling rows (id lists are tiny, so the quadratic table is fine).
Insertion, deletion, and substitution each cost 1.

## Parameters

### a

`string`

### b

`string`

## Returns

`number`

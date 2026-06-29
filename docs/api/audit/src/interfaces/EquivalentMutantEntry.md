[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / EquivalentMutantEntry

# Interface: EquivalentMutantEntry

Defined in: [audit/src/mutation-equivalents.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L52)

One committed equivalent-mutant entry — the mutant's content-address `id` (the
load-bearing match key) plus the human-review fields (`file`/`line`/`operator`/the
rewrite) and the `justification`. The non-id fields are advisory provenance: a
reviewer reads them, but the verdict matches on `id` alone (the anti-drift property).

## Properties

### column

> `readonly` **column**: `number`

Defined in: [audit/src/mutation-equivalents.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L60)

1-based column (human review).

***

### file

> `readonly` **file**: `string`

Defined in: [audit/src/mutation-equivalents.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L56)

The repo-relative file (human review).

***

### justification

> `readonly` **justification**: `string`

Defined in: [audit/src/mutation-equivalents.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L68)

Why this mutation changes no observable behaviour — the justification.

***

### line

> `readonly` **line**: `number`

Defined in: [audit/src/mutation-equivalents.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L58)

1-based line (human review).

***

### mutantId

> `readonly` **mutantId**: `string`

Defined in: [audit/src/mutation-equivalents.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L54)

The mutant's stable content address (blake3) — the load-bearing match key.

***

### mutatedText

> `readonly` **mutatedText**: `string`

Defined in: [audit/src/mutation-equivalents.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L66)

The mutated span text (human review).

***

### operator

> `readonly` **operator**: `string`

Defined in: [audit/src/mutation-equivalents.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L62)

The operator id (human review).

***

### originalText

> `readonly` **originalText**: `string`

Defined in: [audit/src/mutation-equivalents.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-equivalents.ts#L64)

The original span text (human review).

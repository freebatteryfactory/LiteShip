[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MutantOutcome

# Interface: MutantOutcome

Defined in: [gauntlet/src/mutation-facts.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L74)

One evaluated mutant's flat, decided outcome — the host's verdict plus the data
the gate needs to write a self-explaining Finding. A `killed` outcome is adequate
coverage (no finding); a `survived` or `no-coverage` outcome is a coverage
divergence the gate reports.

## Properties

### column

> `readonly` **column**: `number`

Defined in: [gauntlet/src/mutation-facts.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L84)

1-based column of the mutated span.

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/mutation-facts.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L80)

The repo-relative file the mutant lives in — MUST be an IR file (the gate aims its level).

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/mutation-facts.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L82)

1-based line of the mutated span (the finding's location).

***

### mutantId

> `readonly` **mutantId**: `string`

Defined in: [gauntlet/src/mutation-facts.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L76)

The mutant's stable content address (the host's blake3 id) — traceability.

***

### mutatedText

> `readonly` **mutatedText**: `string`

Defined in: [gauntlet/src/mutation-facts.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L90)

The text the span was replaced with — the `original → mutated` the reader sees.

***

### operator

> `readonly` **operator**: `string`

Defined in: [gauntlet/src/mutation-facts.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L86)

The mutation operator id (e.g. `conditional-boundary`) — names WHAT was mutated.

***

### originalText

> `readonly` **originalText**: `string`

Defined in: [gauntlet/src/mutation-facts.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L88)

The exact original source text of the mutated span.

***

### verdict

> `readonly` **verdict**: [`MutantVerdictTag`](../type-aliases/MutantVerdictTag.md)

Defined in: [gauntlet/src/mutation-facts.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/mutation-facts.ts#L78)

The verdict — `killed` (adequate) / `survived` / `no-coverage` (both findings).

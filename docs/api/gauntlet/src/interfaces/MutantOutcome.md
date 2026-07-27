[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / MutantOutcome

# Interface: MutantOutcome

Defined in: [gauntlet/src/facts/mutation-facts.ts:109](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L109)

One evaluated mutant's flat, decided outcome — the host's verdict plus the data
the gate needs to write a self-explaining Finding. A `killed` outcome is adequate
coverage (no finding); a `survived` or `no-coverage` outcome is a coverage
divergence the gate reports.

## Properties

### column

> `readonly` **column**: `number`

Defined in: [gauntlet/src/facts/mutation-facts.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L119)

1-based column of the mutated span.

***

### coveringTests

> `readonly` **coveringTests**: readonly `string`[]

Defined in: [gauntlet/src/facts/mutation-facts.ts:127](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L127)

Sorted tests mapped to this site, even when an equivalent registry bypasses execution.

***

### equivalentJustification

> `readonly` **equivalentJustification**: `string` \| `null`

Defined in: [gauntlet/src/facts/mutation-facts.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L129)

Human proof for an equivalent mutant; null for every executable verdict.

***

### equivalentJustificationDigest

> `readonly` **equivalentJustificationDigest**: `string` \| `null`

Defined in: [gauntlet/src/facts/mutation-facts.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L131)

Content address of the mutant-bound equivalent proof; null for non-equivalents.

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/facts/mutation-facts.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L115)

The repo-relative file the mutant lives in — MUST be an IR file (the gate aims its level).

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/facts/mutation-facts.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L117)

1-based line of the mutated span (the finding's location).

***

### mutantId

> `readonly` **mutantId**: `string`

Defined in: [gauntlet/src/facts/mutation-facts.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L111)

The mutant's stable content address (the host's blake3 id) — traceability.

***

### mutatedText

> `readonly` **mutatedText**: `string`

Defined in: [gauntlet/src/facts/mutation-facts.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L125)

The text the span was replaced with — the `original → mutated` the reader sees.

***

### operator

> `readonly` **operator**: `string`

Defined in: [gauntlet/src/facts/mutation-facts.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L121)

The mutation operator id (e.g. `conditional-boundary`) — names WHAT was mutated.

***

### originalText

> `readonly` **originalText**: `string`

Defined in: [gauntlet/src/facts/mutation-facts.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L123)

The exact original source text of the mutated span.

***

### subsumedBy

> `readonly` **subsumedBy**: readonly `string`[]

Defined in: [gauntlet/src/facts/mutation-facts.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L133)

Proven mutation-subsumption parents. Empty means no subsumption is claimed.

***

### verdict

> `readonly` **verdict**: [`MutantVerdictTag`](../type-aliases/MutantVerdictTag.md)

Defined in: [gauntlet/src/facts/mutation-facts.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mutation-facts.ts#L113)

The verdict — `killed` (adequate) / `survived` / `no-coverage` (both findings).

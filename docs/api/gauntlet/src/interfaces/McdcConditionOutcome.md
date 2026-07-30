[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / McdcConditionOutcome

# Interface: McdcConditionOutcome

Defined in: [gauntlet/src/facts/mcdc-facts.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L81)

One atomic CONDITION's folded MC/DC outcome — the two pins' verdicts plus the data the
gate needs to write a self-explaining Finding. A condition is MC/DC-COVERED iff BOTH
[forceTrueVerdict](#forcetrueverdict) and [forceFalseVerdict](#forcefalseverdict) are `killed`; ANY other
combination is an MC/DC gap (the gate names which pin(s) failed and at what severity).

## Properties

### column

> `readonly` **column**: `number`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L93)

1-based column of the atomic condition's source span.

***

### condition

> `readonly` **condition**: `string`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L97)

The full source text of THIS atomic condition (the leaf the pins force).

***

### conditionId

> `readonly` **conditionId**: `string`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L87)

The stable content address of the condition (the host's blake3 over the
`(file, line, column, conditionText)` identity, force-independent) — traceability +
the gate's de-dup key. Distinct from either pin's mutant id (a pin folds INTO this).

***

### coveringTests

> `readonly` **coveringTests**: readonly `string`[]

Defined in: [gauntlet/src/facts/mcdc-facts.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L103)

Sorted tests mapped to the decision site for both condition pins.

***

### decision

> `readonly` **decision**: `string`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L95)

The full source text of the enclosing DECISION (so the reader sees the whole branch).

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L89)

The repo-relative file the decision lives in — MUST be an IR file (the gate aims its level).

***

### forceFalseVerdict

> `readonly` **forceFalseVerdict**: [`McdcPinVerdict`](../type-aliases/McdcPinVerdict.md)

Defined in: [gauntlet/src/facts/mcdc-facts.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L101)

The verdict of the force-FALSE pin — `killed` ⇒ the false-effect is observed.

***

### forceTrueVerdict

> `readonly` **forceTrueVerdict**: [`McdcPinVerdict`](../type-aliases/McdcPinVerdict.md)

Defined in: [gauntlet/src/facts/mcdc-facts.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L99)

The verdict of the force-TRUE pin — `killed` ⇒ the true-effect is observed.

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/facts/mcdc-facts.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/mcdc-facts.ts#L91)

1-based line of the atomic condition's source span (the finding's location).
